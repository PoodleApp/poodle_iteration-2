/* @flow */

import dateformat            from 'dateformat'
import Connection            from 'imap'
import * as kefir            from 'kefir'
import { decode }            from '../encoding'
import * as imap             from '../util/imap'
import { fromEventsWithEnd } from '../util/kefir'
import * as M                from '../models/Message'
import * as promises         from '../util/promises'

import type { ReadStream } from 'fs'
import type {
  Box,
  FetchOptions,
  ImapMessage,
  MessageAttributes,
  MessageSource,
  UID,
} from 'imap'
import type { Observable } from 'kefir'
import type { Message } from '../models/Message'


// TODO: should we require an open box here?
export function fetchMessagePart(msg: Message, partId: string, conn: Connection): Promise<ReadStream> {
  const part = M.getPart(partId, msg)
  if (!part) {
    return Promise.reject(new Error(`partId ${partId} does not exist in message ${msg.uid}`))
  }

  const encoding = part.encoding

  return fetchMessages([(msg.uid: number)], { bodies: `${partId}` }, conn)
  .flatMap(messageBodyStream)
  .map(body => encoding ? decode(encoding, body) : body)
  .toPromise()
}

export function search(criteria: mixed[], box: Box, conn: Connection): Observable<Message, mixed> {
  const uidsPromise = promises.lift1(cb => conn.search(criteria, cb))
  return kefir.fromPromise(uidsPromise)
    .flatMap(uids => fetchMessages(uids, {
      envelope: true,
      struct: true,
    }, conn))
    .flatMap(getAttributes)
}

export function searchUids(criteria: mixed[], box: Box, conn: Connection): Observable<UID[], mixed> {
  const uidsPromise = promises.lift1(cb => conn.search(criteria, cb))
  return kefir.fromPromise(uidsPromise)
}

export function fetchRecent(since: Date, box: Box, conn: Connection): Observable<Message, mixed> {
  const q = dateformat(since, 'mmmm d, yyyy')
  return search([['SINCE', q]], box, conn)
}

// TODO: Use 'changedsince' option defined by RFC4551
// TODO: should we require an open box here?
export function fetchMessages(source: MessageSource, opts: FetchOptions, conn: Connection): Observable<ImapMessage,mixed> {
  return fromEventsWithEnd(conn.fetch(source, opts), 'message', (msg, seqno) => msg)
}

function messageBodyStream(msg: ImapMessage): Observable<ReadStream, mixed> {
  return fromEventsWithEnd(msg, 'body', (stream, info) => stream)
}

export function getAttributes(message: ImapMessage): Observable<MessageAttributes,mixed> {
  return fromEventsWithEnd(message, 'attributes')
}
