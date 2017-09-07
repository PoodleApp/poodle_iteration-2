/* @flow */

import Message from 'arfe/lib/models/Message'
import dateformat from 'dateformat'
import * as kefir from 'kefir'
import { simpleParser } from 'mailparser'
import { decode } from '../encoding'
import { type Connection, type OpenBox } from '../models/connection'
import * as imap from '../util/imap'
import * as kefirutil from '../util/kefir'
import * as promises from '../util/promises'

import type {
  Box,
  FetchOptions,
  ImapMessage,
  MessageAttributes,
  MessageSource,
  UID
} from 'imap'
import type { Readable } from 'stream'
import type { Observable } from 'kefir'

const headersSelection = 'HEADER'

export function fetchMessageParts (
  msg: Message,
  partId: string,
  openBox: OpenBox
): Promise<Readable> {
  const part = msg.getPart({ partId })
  if (!part) {
    return Promise.reject(
      new Error(`part ID ${partId} does not exist in message ${msg.uid}`)
    )
  }

  const encoding = part.encoding

  return fetch(([msg.uid]: number[]), { bodies: part.partID }, openBox)
    .flatMap(messageBodyStream)
    .map(body => (encoding ? decode(encoding, body) : body))
    .toPromise()
}

export function search (
  criteria: mixed[],
  openBox: OpenBox
): Promise<UID[]> {
  return promises.lift1(cb => openBox.connection.search(criteria, cb))
}

// export function searchUids (
//   criteria: mixed[],
//   box: Box,
//   conn: Connection
// ): Promise<UID[]> {
//   const uidsPromise = promises.lift1(cb => conn.search(criteria, cb))
//   return kefir.fromPromise(uidsPromise)
// }

// export function fetchRecent (
//   since: Date,
//   openBox: OpenBox
// ): Promise<UID[]> {
//   const q = dateformat(since, 'mmmm d, yyyy')
//   return search([['SINCE', q]], openBox)
// }

export function fetch (
  source: MessageSource,
  opts: FetchOptions,
  openBox: OpenBox
): Observable<ImapMessage, mixed> {
  return kefirutil.fromEventsWithEnd(
    openBox.connection.fetch(source, opts),
    'message',
    (msg, seqno) => msg
  )
}

export function fetchMetadata (
  source: MessageSource,
  openBox: OpenBox
): Observable<Message, mixed> {
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
    return kefir.zip(
      [attrStream, headersStream],
      (imapMsg, headers) => new Message(imapMsg, headers)
    )
  })
}

// TODO: this might come in multiple chunks
function messageBodyStream (msg: ImapMessage): Observable<Readable, mixed> {
  return kefirutil.fromEventsWithEnd(msg, 'body', (stream, info) => stream)
}

export function getAttributes (
  message: ImapMessage
): Observable<MessageAttributes, mixed> {
  return kefirutil.fromEventsWithEnd(message, 'attributes')
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

function getHeaders (message: ImapMessage): Observable<Headers, mixed> {
  const bodies = kefirutil.fromEventsWithEnd(
    message,
    'body',
    (stream, info) => [stream, info]
  )
  return bodies.flatMap(([stream, info]) => {
    if (info.which !== headersSelection) {
      return kefir.never()
    }
    return kefirutil.collectData(stream).flatMap(data => {
      const headers = simpleParser(data).then(mail => mail.headers)
      return kefir.fromPromise(headers)
    })
  })
}
