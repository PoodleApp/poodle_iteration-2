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
import * as kefirUtil from '../util/kefir'
import * as promises from '../util/promises'

import type {
  Box,
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

/*
 * Downloads and saves messages if they do not already exist in the cache; emits
 * IDs of the messages in PouchDB
 */
export function downloadMessages (
  uids: UID[],
  openBox: OpenBox,
  db: PouchDB
): Observable<URI> {
  uids = uids.map(String) // We will get cache misses if uids are not correct type
  const boxName = openBox.box.name
  const uidvalidity = String(openBox.box.uidvalidity)
  const uidsInCache = kefir.fromPromise(
    query
      .verifyExistenceUids(uids.map(uid => ({ boxName, uidvalidity, uid })), db)
      .then(keys => keys.map(({ uid }) => uid))
  )
  const uidsToFetch = uidsInCache.map(inCache =>
    uids.filter(uid => !inCache.includes(uid))
  )
  return uidsToFetch
    .flatMap(uids =>
      fetchMessages(uids, openBox).flatMap(message =>
        kefir
          .fromPromise(cache.persistMessage(message, db))
          .map(() => message.id)
      )
    )
}

export async function downloadPartContent (
  messageId: string,
  uid: UID,
  part: MessagePart,
  openBox: OpenBox,
  db: PouchDB
): Promise<ID> {
  const data = await fetchMessagePart(uid, part, openBox)
  return cache.persistPart(messageId, part, data, db)
}

export function fetchMessagePart (
  uid: UID,
  part: MessagePart,
  openBox: OpenBox
): Promise<Readable> {
  const encoding = part.encoding
  return fetch(([uid]: string[]), { bodies: part.partID }, openBox)
    .flatMap(messageBodyStream)
    .map(body => (encoding ? decode(encoding, body) : body))
    .toPromise()
}

export function search (criteria: mixed[], openBox: OpenBox): Promise<UID[]> {
  return promises.lift1(cb => openBox.connection.search(criteria, cb))
}

export function fetch (
  source: MessageSource,
  opts: FetchOptions,
  openBox: OpenBox
): Observable<ImapMessage, Error> {
  return kefirUtil.fromEventsWithEnd(
    openBox.connection.fetch(source, opts),
    'message',
    (msg, seqno) => msg
  )
}

/*
 * Downloads message structure and metadata, but not content parts
 */
export function fetchMessages (
  source: MessageSource,
  openBox: OpenBox
): Observable<Message, Error> {
  const respStream = fetch(
    source,
    {
      bodies: headersSelection,
      envelope: true,
      struct: true
    },
    openBox
  )
  return respStream.flatMap(imapMsg => {
    const attrStream = getAttributes(imapMsg)
    const headersStream = getHeaders(imapMsg)
    const boxName = openBox.box.name
    const uidvalidity = String(openBox.box.uidvalidity)
    return kefir.zip([attrStream, headersStream], (imapMsg, headers) => {
      const flags = imapMsg.flags
      const uid = String(imapMsg.uid)
      const perBoxMetadata = [{ boxName, flags, uid, uidvalidity }]
      return new Message(imapMsg, headers, perBoxMetadata)
    })
  })
}

// TODO: this might come in multiple chunks
function messageBodyStream (msg: ImapMessage): Observable<Readable, mixed> {
  return kefirUtil.fromEventsWithEnd(msg, 'body', (stream, info) => stream)
}

export function getAttributes (
  message: ImapMessage
): Observable<MessageAttributes, Error> {
  return kefirUtil.fromEventsWithEnd(message, 'attributes')
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
