/* @flow */

import * as AS from 'activitystrea.ms'
import * as compose from 'arfe/lib/compose'
import Conversation, * as Conv from 'arfe/lib/models/Conversation'
import * as mediaType from 'arfe/lib/models/mediaType'
import Message from 'arfe/lib/models/Message'
import { type Headers } from 'arfe/lib/models/Message'
import * as Part from 'arfe/lib/models/MessagePart'
import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import { type URI, parseMidUri } from 'arfe/lib/models/uri'
import dateformat from 'dateformat'
import * as kefir from 'kefir'
import * as m from 'mori'
import { type Readable } from 'stream'
import toString from 'stream-to-string'
import * as cache from '../cache'
import { type Connection, type OpenBox } from '../models/connection'
import * as request from '../request'
import * as actions from '../request/actions'
import { jsonToMap } from '../util/native'
import * as kefirUtil from '../util/kefir'
import * as promises from '../util/promises'
import { openBox } from './stateChanges'
import Task from './Task'
import { type LiveConversation } from './types'

import type {
  Box,
  BoxList,
  FetchOptions,
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
  return getBox()
    .flatMap(box => {
      const boxName = box.name
      const uidvalidity = String(box.uidvalidity)

      const uidsToFetch = dbTask(db =>
        kefir.fromPromise(
          cache.identifyMissingUids(boxName, uidvalidity, uids, db)
        )
      )

      return uidsToFetch
        .filter(uids => uids.length > 0)
        .flatMap(uids =>
          fetchMessages(uids).flatMap(message =>
            dbTask(db =>
              kefir.fromPromise(cache.persistMessageRecord(message, db))
            )
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

export function fetchAttributes (
  source: MessageSource,
  opts: FetchOptions
): Task<MessageAttributes> {
  return connectionTask(actions.fetchAttributes(source, opts))
}

export function fetchAttributesAndHeaders (
  source: MessageSource,
  opts: FetchOptions
): Task<{ attributes: MessageAttributes, headers: Headers }> {
  return connectionTask(
    actions.fetchAttributesAndHeaders(source, opts)
  ).map(({ attributes, headers }) => ({
    attributes,
    headers: jsonToMap(headers)
  }))
}

export function fetchMessagePart (uid: UID, part: MessagePart): Task<Readable> {
  const encoding = part.encoding
  return connectionTask(
    actions.fetchBody(([uid]: string[]), { bodies: part.partID }, encoding)
  ).modifyObservable(bufferStream => {
    const readable = kefirUtil.toReadable(bufferStream)
    return kefir.constant(readable)
  })
}

/*
 * Downloads message structure and metadata, but not content parts
 */
function fetchMessages (source: MessageSource): Task<cache.MessageRecord> {
  return getBox().flatMap(box => {
    const uidvalidity = String(box.uidvalidity)
    return fetchAttributesAndHeaders(source, {
      bodies: headersSelection,
      envelope: true,
      struct: true
    }).map(({ attributes, headers }) => {
      const message = new Message(attributes, headers)
      const uid = String(attributes.uid)
      const imapLocation = [box.name, uidvalidity, uid]
      return cache.messageToRecord(message, [imapLocation])
    })
  })
}

export function fetchPartByUri (
  uri: URI
): Task<?{ message: Message, part: Part.MessagePart }> {
  return fetchPartContext(uri).map(({ message, partRef }) => {
    const part = message.getPart(partRef)
    return part && { message, part }
  })
}

export function fetchPartContentByUri (uri: URI): Task<?Readable> {
  return dbTask(db =>
    kefir.fromPromise(cache.fetchContentByUri(uri, db).catch(() => {}))
  ).flatMap(data => {
    if (data) {
      return Task.result(data)
    }
    return fetchPartContext(uri)
      .flatMap(({ message, partRef }) => fetchPartContent(message, partRef))
      .modifyObservable(obs =>
        // Insert `undefined` so that we get a value emitted in case an error
        // occurred
        obs.beforeEnd(() => undefined).take(1)
      )
  })
}

function fetchPartContext (
  uri: URI
): Task<{ message: Message, partRef: Part.PartRef }> {
  const parsed = parseMidUri(uri)
  const messageId = parsed && parsed.messageId
  const contentId = parsed && parsed.contentId
  if (!messageId || !contentId) {
    return Task.error(
      new Error(`Unable to parse messageID and contentID from URI: ${uri}`)
    )
  }

  // Some message parts do not have content IDs. (content IDs are explicit
  // headers on parts, part IDs are assigned to content parts in order when
  // parsing a message). In cases with no content ID we fall back to part IDs
  // for `mid:` URIs (in contradiction of RFC-2392). Unfortunately that means
  // that when we parse a `mid` URI we do not know whether the result is
  // a content ID or a part ID. The ambiguous ID type encodes a ref for those
  // cases. In general an ambiguous ID will result in a lookup by content ID
  // first, and then by part ID in case the content ID lookup fails.
  const partRef = Part.ambiguousId(contentId)

  return dbTask(db =>
    kefir.fromPromise(
      cache.getMessage(messageId, db).catch(err => {
        // TODO: fall back to scanning mailboxes for the given message ID
        throw new Error(
          `Tried to fetch content, but there is no local copy of the containing message, so we don't know which mailbox to look in.`
        )
      })
    )
  ).map(message => ({ message, partRef }))
}

/*
 * Designed to be consumable by `Conv.messagesToConversation`. Use
 * `Task.promisify(fetchPartContent)` to produce a version of this function that
 * produces a `Promise`.
 */
export function fetchPartContent (
  msg: Message,
  partRef: Part.PartRef
): Task<Readable> {
  return fetchPartContentFromCache(msg, partRef).flatMap(data => {
    if (data) {
      return Task.result(data)
    }
    // TODO: check uid validity
    const part = msg.getPart(partRef)
    if (!part) {
      return Task.error(
        new Error(
          `Cannot find part with ID ${String(partRef)} in message, ${msg.id}`
        )
      )
    }
    return Task.isolate(
      locateImapMessage(msg).flatMap(uid =>
        downloadPartContent(msg.id, uid, part)
      )
    ).flatMap(cacheId =>
      dbTask(db => kefir.fromPromise(cache.fetchContentByUri(cacheId, db)))
    )
  })
}

function fetchPartContentFromCache (
  msg: Message,
  partRef: Part.PartRef
): Task<?Readable> {
  return dbTask(db =>
    kefir.fromPromise(
      cache.fetchPartContent(msg, partRef, db).catch(() => undefined) // Resolve to `undefined` if content is not in cache
    )
  )
}

// Attempts to find a cached UID that is valid on the IMAP server, and opens the
// appropriate IMAP box.
// TODO: attempt to update message record when encountering stale uids
function locateImapMessage (msg: Message): Task<UID> {
  return dbTask(db =>
    kefir.fromPromise(cache.getMessageRecord(msg.id, db))
  ).flatMap(messageRecord => {
    const locs = messageRecord.imapLocations
    if (!locs || locs.length < 1) {
      return Task.error(
        new Error(
          `Cannot fetch part content for message with no known UID, ${msg.id}`
        )
      )
    }
    return locateImapMessageHelper(msg, locs)
  })
}

function locateImapMessageHelper (
  msg: Message,
  locations: cache.ImapLocation[]
): Task<UID> {
  if (locations.length < 1) {
    return Task.error(
      new Error(`No stored UID for message is currently valid, ${msg.id}`)
    )
  }
  const [boxName, uidValidity, uid] = locations[0]
  return Task.isolate(
    openBox({ name: boxName }, true).flatMap(getBox).flatMap(box => {
      // TODO: make changes to be more consistent about string-vs-number
      if (String(box.uidvalidity) !== uidValidity) {
        // TODO: remove stale location from cache
        return locateImapMessageHelper(msg, locations.slice(1))
      }
      return Task.result(uid)
    })
  )
}

export type Content = {
  content: string,
  mediaType: string
}

export function getActivityContent (
  activity: DerivedActivity,
  preferences: string[] = ['text/html', 'text/plain']
): Task<?Content> {
  const prefTypes = preferences.map(mediaType.fromString)
  const links = m.mapcat(
    pref =>
      m.filter(
        l => mediaType.isCompatible(pref, mediaType.fromString(l.mediaType)),
        activity.objectLinks
      ),
    prefTypes
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

  return fetchPartContentByUri(link.href).flatMap(stream => {
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
  return getActivityContent(activity, preferences).map(
    result => result && result.content.slice(0, length)
  )
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

// TODO: fall back to searching server if conversation is not in cache
export function getConversation (uri: URI): Task<Conversation> {
  return Task.promisify(fetchPartContent).flatMap(fetchPartContent => {
    return dbTask(db =>
      kefirUtil.takeAll(cache.getConversation(uri, db))
    ).flatMap(messages => {
      if (messages.length < 1) {
        return Task.error(
          new Error(`No messages in cache for conversation, ${uri}`)
        )
      }
      return Task.liftPromise(
        Conv.messagesToConversation(fetchPartContent, messages)
      )
    })
  })
}

const pollInterval = 5000 // 5 seconds

// Gets a conversation from cache by URI; emits updates to conversation as new
// messages appear in cache.
export function watchConversation (uri: URI): Task<LiveConversation> {
  return getConversation(uri).flatMap(conversation => {
    let conversationSnapshot = conversation
    return dbTask(db =>
      kefir
        .interval(pollInterval)
        .flatMap(() =>
          kefir.fromPromise(
            cache.hasConversationBeenUpdated(conversationSnapshot, db)
          )
        )
    )
      .filter(updated => updated)
      .flatMap(() => getConversation(uri))
      .modifyObservable(updatedConvs =>
        updatedConvs.scan(
          (prev, next) => {
            conversationSnapshot = next
            const changes = m.intoArray(Conv.changes(prev.conversation, next))
            return { conversation: next, changes }
          },
          { conversation }
        )
      )
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

export function dbTask<T> (fn: (db: cache.DB) => Observable<T, Error>): Task<T> {
  return Task.getContext().flatMap(({ db }) => Task.lift(fn(db)))
}

export function serialize (
  message: Message
): Task<compose.MessageConfiguration> {
  return Task.promisify(fetchPartContent).flatMap(fetcher =>
    Task.liftPromise(compose.serialize(fetcher, message))
  )
}
