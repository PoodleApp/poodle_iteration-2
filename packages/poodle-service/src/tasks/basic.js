/* @flow */

import * as AS from 'activitystrea.ms'
import Conversation, * as Conv from 'arfe/lib/models/Conversation'
import Message from 'arfe/lib/models/Message'
import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import { type URI, parseMidUri } from 'arfe/lib/models/uri'
import dateformat from 'dateformat'
import * as kefir from 'kefir'
import { simpleParser } from 'mailparser'
import * as m from 'mori'
import type PouchDB from 'pouchdb-node'
import { type Readable } from 'stream'
import toString from 'stream-to-string'
import * as cache from '../cache'
import { decode } from '../encoding'
import { type Connection, type OpenBox } from '../models/connection'
import * as request from '../request'
import * as actions from '../request/actions'
import * as kefirUtil from '../util/kefir'
import * as promises from '../util/promises'
import { openBox } from './stateChanges'
import Task from './Task'

import type {
  Box,
  BoxList,
  FetchOptions,
  ImapMessage,
  MessageAttributes,
  MessagePart,
  MessageSource,
  UID
} from 'imap'
import type { Observable } from 'kefir'

type Actor = AS.models.Object
type ID = string

const headersSelection = 'HEADER'

export function serverSupports (capability: string): Task<boolean> {
  return connectionTask(actions.getCapabilities()).map(caps =>
    caps.includes(capability)
  )
}

export function requireCapability (capability: string): Task<void> {
  return serverSupports(capability).flatMap(hasSupport => {
    if (!hasSupport) {
      return Task.error(
        Error(`IMAP server is missing required capability: ${capability}`)
      )
    } else {
      return Task.result(undefined)
    }
  })
}

/*
 * Downloads and saves messages if they do not already exist in the cache
 */
export function downloadMessages (uids: UID[]): Task<void> {
  uids = uids.map(String) // We will get cache misses if uids are not correct type
  return getBox().flatMap(box => {
    const boxName = box.name
    const uidvalidity = String(box.uidvalidity)

    const uidsInCache = dbTask(db =>
      kefir.fromPromise(
        cache
          .verifyExistenceUids(
            uids.map(uid => ({ boxName, uidvalidity, uid })),
            db
          )
          .then(keys => keys.map(({ uid }) => uid))
      )
    )

    const uidsToFetch = uidsInCache.map(inCache =>
      uids.filter(uid => !inCache.includes(uid))
    )

    return uidsToFetch
      .filter(uids => uids.length > 0)
      .flatMap(uids =>
        fetchMessages(uids).flatMap(message =>
          dbTask(db => kefir.fromPromise(cache.persistMessage(message, db)))
        )
      )
  })
  .emitWhenDone()
}

export function downloadPart (opts: {
  messageId: string,
  box: request.BoxSpecifier,
  part: MessagePart,
  uid: UID
}): Task<ID> {
  return openBox(opts.box).flatMap(() =>
    downloadPartContent(opts.messageId, opts.uid, opts.part)
  )
}

export function downloadPartContent (
  messageId: string,
  uid: UID,
  part: MessagePart
): Task<ID> {
  return fetchMessagePart(uid, part).flatMap(data =>
    dbTask(db =>
      kefir.fromPromise(cache.persistPart(messageId, part, data, db))
    )
  )
}

export function search (criteria: mixed[]): Task<UID[]> {
  return connectionTask(actions.search(criteria))
}

export function fetch (
  source: MessageSource,
  opts: FetchOptions
): Task<ImapMessage> {
  return connectionTask(actions.fetch(source, opts))
}

export function fetchMessagePart (uid: UID, part: MessagePart): Task<Readable> {
  const encoding = part.encoding
  return fetch(([uid]: string[]), { bodies: part.partID })
    .flatMap(msg => Task.lift(messageBodyStream(msg)))
    .map(body => (encoding ? decode(encoding, body) : body))
}

/*
 * Downloads message structure and metadata, but not content parts
 */
export function fetchMessages (source: MessageSource): Task<Message> {
  return getBox().flatMap(box => {
    const uidvalidity = String(box.uidvalidity)
    const respStream = fetch(source, {
      bodies: headersSelection,
      envelope: true,
      struct: true
    })
    return respStream.flatMap(imapMsg => {
      const attrStream = getAttributes(imapMsg)
      const headersStream = getHeaders(imapMsg)
      return Task.lift(
        kefir.zip([attrStream, headersStream], (imapMsg, headers) => {
          const flags = imapMsg.flags
          const uid = String(imapMsg.uid)
          const perBoxMetadata = [
            { boxName: box.name, flags, uid, uidvalidity }
          ]
          return new Message(imapMsg, headers, perBoxMetadata)
        })
      )
    })
  })
}

function fetchPartContentByUri (uri: URI): Task<?Readable> {
  return dbTask(db =>
    kefir.fromPromise(cache.fetchContentByUri(db, uri).catch(() => {}))
  ).flatMap(data => {
    if (data) {
      return Task.result(data)
    }
    const parsed = parseMidUri(uri)
    const messageId = parsed && parsed.messageId
    const contentId = parsed && parsed.contentId
    if (!messageId || !contentId) {
      throw new Error(
        `Unable to parse messageID and contentID from URI: ${uri}`
      )
    }
    return dbTask(db =>
      kefir.fromPromise(
        cache.getMessage(messageId, db).catch(err => {
          // TODO: fall back to scanning mailboxes for the given message ID
          throw new Error(
            `Tried to fetch content, but there is no local copy of the containing message, so we don't know which mailbox to look in.`
          )
        })
      )
    )
      .flatMap(message => fetchPartContent(message, contentId))
      .modifyObservable(obs =>
        // Insert `undefined` so that we get a value emitted in case an error
        // occurred
        obs.beforeEnd(() => undefined).take(1)
      )
  })
}

/*
 * Designed to be consumable by `Conv.messagesToConversation`. Use
 * `Task.promisify(fetchPartContent)` to produce a version of this function that
 * produces a `Promise`.
 */
export function fetchPartContent (
  msg: Message,
  contentId: string
): Task<Readable> {
  return fetchPartContentFromCache(msg, contentId).flatMap(data => {
    if (data) {
      return Task.result(data)
    }
    // TODO: check uid validity
    const part = msg.getPart({ contentId })
    if (!part) {
      return Task.error(
        new Error(`Cannot find part with ID ${contentId} in message, ${msg.id}`)
      )
    }
    const meta = msg.perBoxMetadata && msg.perBoxMetadata[0]
    if (!meta) {
      return Task.error(
        new Error(
          `Cannot fetch part content for message with no UID, ${msg.id}`
        )
      )
    }
    const { boxName, uid, uidvalidity } = meta
    return Task.isolate(
      openBox({ name: boxName }, true).flatMap(getBox).flatMap(box => {
        // TODO: make changes to be more consistent about string-vs-number
        if (String(box.uidvalidity) !== uidvalidity) {
          // TODO: check other stored UIDs; download content from server
          return Task.error(new Error(`Stored uidvalidity does not match!`))
        }
        return downloadPartContent(msg.id, uid, part)
      })
    ).flatMap(cacheId =>
      dbTask(db => kefir.fromPromise(cache.fetchContentByUri(db, cacheId)))
    )
  })
}

function fetchPartContentFromCache (
  msg: Message,
  contentId: string
): Task<?Readable> {
  return dbTask(db =>
    kefir.fromPromise(
      cache.fetchPartContent(db, msg, contentId).catch(() => undefined) // Resolve to `undefined` if content is not in cache
    )
  )
}

// TODO: this might come in multiple chunks
function messageBodyStream (msg: ImapMessage): Observable<Readable, Error> {
  return kefirUtil.fromEventsWithEnd(msg, 'body', (stream, info) => stream)
}

export type Content = {
  content: string,
  mediaType: string
}

export function getActivityContent (
  activity: DerivedActivity,
  preferences: string[] = ['text/html', 'text/plain']
): Task<?Content> {
  const links = m.mapcat(
    pref => m.filter(l => l.mediaType === pref, activity.objectLinks),
    preferences
  )
  const link = m.first(links)

  if (!link) {
    return Task.result(undefined) // no content
  }

  const href = link.href
  if (!href) {
    return Task.error(
      new Error(
        `object link does not have an \`href\` property in activity ${activity.id}`
      )
    )
  }

  return fetchPartContentByUri(link.href)
    .flatMap(stream => {
      if (stream) {
        return Task.liftPromise(toString(stream, 'utf8')) // TODO: check charset
          .map(content => ({ content, mediaType: link.mediaType }))
      } else {
        return Task.result(undefined)
      }
    })
}

export function getActivityContentSnippet (
  activity: DerivedActivity,
  length: number = 100,
  preferences: string[] = ['text/plain', 'text/html']
): Task<?string> {
  return getActivityContent(activity, preferences)
    .map(result => result && result.content.slice(0, length))
}

export function getAttributes (
  message: ImapMessage
): Observable<MessageAttributes, Error> {
  return kefirUtil.fromEventsWithEnd(message, 'attributes')
}

export function getBoxes (): Task<BoxList> {
  return connectionTask(actions.getBoxes())
}

export function getBox (): Task<Box> {
  return connectionTask(actions.getBox()).flatMap(box => {
    if (!box) {
      return Task.error(
        new Error('Attempted to read box metadata, but no box is open')
      )
    } else {
      return Task.result(box)
    }
  })
}

// native Javascript Map
type Headers = Map<string, HeaderValue>
type HeaderValue =
  | string
  | string[]
  | {
      value: string,
      params: { charset: string }
    }

function getHeaders (message: ImapMessage): Observable<Headers, Error> {
  const bodies = kefirUtil.fromEventsWithEnd(
    message,
    'body',
    (stream, info) => [stream, info]
  )
  return bodies.flatMap(([stream, info]) => {
    if (info.which !== headersSelection) {
      return kefir.never()
    }
    return kefirUtil.collectData(stream).flatMap(data => {
      const headers = simpleParser(data).then(mail => mail.headers)
      return kefir.fromPromise(headers)
    })
  })
}

// TODO: fall back to searching server if conversation is not in cache
export function getConversation (uri: URI): Task<Conversation> {
  return Task.promisify(fetchPartContent).flatMap(fetchPartContent => {
    return dbTask(db =>
        kefir.fromPromise(cache.getConversation(uri, db))
      )
      .flatMap(messages => {
        if (messages.length < 1) {
          return Task.error(new Error(`No messages in cache for conversation, ${uri}`))
        }
        return Task.liftPromise(
          Conv.messagesToConversation(fetchPartContent, messages)
        )
      })
  })
}

export type ConversationListItem = {
  id: URI,
  lastActiveTime: Date,
  latestActivity: ActivityListItem,
  participants: Actor[],
  subject: ?string
}

export type ActivityListItem = {
  actor: ?Actor,
  contentSnippet: ?string
}

export function processConversationForListView (
  conv: Conversation
): Task<ConversationListItem> {
  const activity = conv.latestActivity
  return getActivityContentSnippet(activity).map(contentSnippet => ({
    id: conv.id,
    lastActiveTime: conv.lastActiveTime.toDate(),
    latestActivity: {
      actor: activity.actor,
      contentSnippet
    },
    participants: m.intoArray(conv.flatParticipants),
    subject: conv.subject
  }))
}

function connectionTask<T> (action: actions.Action<T>): Task<T> {
  return new Task((context, state) =>
    context.runImapAction(action, state).map(value => ({ value, state }))
  )
}

export function dbTask<T> (fn: (db: PouchDB) => Observable<T, Error>): Task<T> {
  return Task.getContext().flatMap(({ db }) => Task.lift(fn(db)))
}
