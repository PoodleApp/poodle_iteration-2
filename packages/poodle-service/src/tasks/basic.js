/* @flow */

import Message from 'arfe/lib/models/Message'
import { type URI } from 'arfe/lib/models/uri'
import dateformat from 'dateformat'
import * as kefir from 'kefir'
import { simpleParser } from 'mailparser'
import type PouchDB from 'pouchdb-node'
import * as cache from '../cache/persist'
import * as query from '../cache/query'
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
import type { Readable } from 'stream'
import type { Observable } from 'kefir'

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
 * Downloads and saves messages if they do not already exist in the cache; emits
 * IDs of the messages in PouchDB
 */
export function downloadMessages (uids: UID[]): Task<void> {
  uids = uids.map(String) // We will get cache misses if uids are not correct type
  return getBox().flatMap(box => {
    const boxName = box.name
    const uidvalidity = String(box.uidvalidity)

    const uidsInCache = dbTask(db =>
      kefir.fromPromise(
        query
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

    return uidsToFetch.filter(uids => uids.length > 0).flatMap(uids =>
      fetchMessages(uids).flatMap(message =>
        dbTask(db => kefir.fromPromise(cache.persistMessage(message, db)))
      )
    )
  })
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

export function fetchMessagePart (uid: UID, part: MessagePart): Task<Readable> {
  const encoding = part.encoding
  return fetch(([uid]: string[]), { bodies: part.partID })
    .flatMap(msg => Task.lift(messageBodyStream(msg)))
    .map(body => (encoding ? decode(encoding, body) : body))
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

/*
 * Downloads message structure and metadata, but not content parts
 */
export function fetchMessages (source: MessageSource): Task<Message> {
  const respStream = fetch(source, {
    bodies: headersSelection,
    envelope: true,
    struct: true
  })
  return respStream.flatMap(imapMsg => {
    const attrStream = getAttributes(imapMsg)
    const headersStream = getHeaders(imapMsg)
    return getBox().flatMap(box => {
      const uidvalidity = String(box.uidvalidity)
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

// TODO: this might come in multiple chunks
function messageBodyStream (msg: ImapMessage): Observable<Readable, Error> {
  return kefirUtil.fromEventsWithEnd(msg, 'body', (stream, info) => stream)
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

function connectionTask<T> (action: actions.Action<T>): Task<T> {
  return new Task((context, state) =>
    context.performRequest(action, state).map(value => ({ value, state }))
  )
}

function dbTask<T> (fn: (db: PouchDB) => Observable<T, Error>): Task<T> {
  return Task.getContext().flatMap(({ db }) => Task.lift(fn(db)))
}
