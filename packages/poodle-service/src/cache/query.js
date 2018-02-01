/* @flow */

import type Conversation from 'arfe/lib/models/Conversation'
import Message, * as Msg from 'arfe/lib/models/Message'
import * as Part from 'arfe/lib/models/MessagePart'
import unique from 'array-unique'
import * as blobToStream from 'blob-to-stream'
import * as kefir from 'kefir'
import * as kefirUtil from '../util/kefir'
import * as m from 'mori'
import * as DB from './indexeddb'

import type { UID } from 'imap'
import type { Observable } from 'kefir'
import type { Readable } from 'stream'
import type { MessageRecord, PartRecord, QueryParams } from './types'

export function getConversation (
  uri: string,
  db: DB.DB
): kefir.Observable<Message> {
  const parsed = Msg.parseMidUri(uri)
  const messageId = parsed && parsed.messageId
  if (!messageId) {
    return kefir.constantError(
      new Error(
        'cannot parse conversation URI according to `mid:` scheme: ' + uri
      )
    )
  }
  return kefir
    .fromPromise(getMessageRecord(messageId, db))
    .flatMap(messageRecord =>
      getConversationById(messageRecord.conversationId, db)
    )
}

function getConversationById (
  conversationId: string,
  db: DB.DB
): kefir.Observable<Message> {
  if (!conversationId) {
    return kefir.constantError(
      new Error('Cannot fetch thread without a conversation ID')
    )
  }
  return getThread(conversationId, db).map(asMessage)
}

export async function hasConversationBeenUpdated (
  conversation: Conversation,
  db: DB.DB
): Promise<boolean> {
  const messageCount = await DB.transaction(
    db,
    ['messages'],
    'readonly',
    messages =>
      DB.count(messages, 'conversationId', DB.IDBKeyRange.only(conversation.id))
  )
  return messageCount > m.count(conversation.messages)
}

export async function getMessage (id: string, db: DB.DB): Promise<Message> {
  const record = await getMessageRecord(id, db)
  return asMessage(record)
}

export function getMessageRecord (
  id: string,
  db: DB.DB
): Promise<MessageRecord> {
  return DB.transaction(db, ['messages'], 'readonly', messages =>
    DB.get(messages, id)
  )
}

export function getPartRecord (uri: string, db: DB.DB): Promise<PartRecord> {
  return DB.transaction(db, ['messageParts'], 'readonly', messageParts =>
    DB.get(messageParts, uri)
  )
}

export function getMessagesByThreadId (
  threadId: string,
  db: DB.DB
): kefir.Observable<Message> {
  if (!threadId) {
    return kefir.constantError(
      new Error('Cannot fetch thread without a thread ID')
    )
  }
  return queryMessages(db, 'googleThreadId', DB.IDBKeyRange.only(threadId))
}

// Given a list of IMAP UIDs, returns the UIDs that are not present in the
// cache.
export function identifyMissingUids (
  boxName: string,
  uidvalidity: UID,
  uids: UID[],
  db: DB.DB
): Promise<UID[]> {
  const [min, max] = findExtrema(uids)
  const keyRange = DB.IDBKeyRange.bound(
    [boxName, uidvalidity, min],
    [boxName, uidvalidity, max]
  )
  const stream = DB.txStream(
    db,
    ['messages'],
    'readonly',
    messages =>
      DB.query(messages, 'imapLocations', keyRange).map(({ key }) => key[2]) // Get keys, extract UID from each key
  )
  const present = kefirUtil.takeAll(stream)
  const missing = present.map(uidsInCache =>
    uids.filter(uid => !uidsInCache.includes(uid))
  )
  return missing.toPromise()
}

function findExtrema (xs: UID[]): [UID, UID] {
  let min = xs[0]
  let max = xs[0]
  for (const x of xs) {
    if (x < min) {
      min = x
    }
    if (x > max) {
      max = x
    }
  }
  return [min, max]
}

function queryMessageRecords (
  db: DB.DB,
  indexName: string,
  keyRange: IDBKeyRange,
  direction?: IDBDirection
): kefir.Observable<MessageRecord> {
  return DB.txStream(db, ['messages'], 'readonly', messages =>
    DB.query(messages, indexName, keyRange, direction).map(({ value }) => value)
  )
}

function queryMessages (
  db: DB.DB,
  indexName: string,
  keyRange: IDBKeyRange,
  direction?: IDBDirection
): kefir.Observable<Message> {
  return queryMessageRecords(db, indexName, keyRange, direction).map(asMessage)
}

/*
 * Get all messages that reference or are referenced by the given message
 * (including the input message itself).
 */
function getThread (
  conversationId: string,
  db: DB.DB
): kefir.Observable<MessageRecord> {
  return queryMessageRecords(
    db,
    'conversationId',
    DB.IDBKeyRange.only(conversationId)
  )
}

export async function fetchPartContent (
  msg: Message,
  partRef: Part.PartRef,
  db: DB.DB
): Promise<Readable> {
  const part = msg.getPart(partRef)
  if (!part) {
    throw new Error(`No part with ID ${String(partRef)} for message ${msg.id}`)
  }
  return fetchContentByUri(msg.uriForPart(part), db)
}

// TODO: in case URI was constructed using a partID instead of a contentID, fall
// back to looking for a record with the matching partID
export async function fetchContentByUri (
  uri: string,
  db: DB.DB
): Promise<Readable> {
  const record = await getPartRecord(uri, db)
  return blobToStream.toStream(record.content)
}

function asMessage ({ message, headers }: MessageRecord): Message {
  return new Message(message, new Map(headers))
}
