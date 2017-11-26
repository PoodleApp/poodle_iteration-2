/* @flow */

import type Conversation from 'arfe/lib/models/Conversation'
import Message, * as Msg from 'arfe/lib/models/Message'
import * as Part from 'arfe/lib/models/MessagePart'
import unique from 'array-unique'
import * as kefir from 'kefir'
import PouchDB from 'pouchdb-node'
import stream from 'stream'
import * as pouchdbUtil from '../util/pouchdb'

import type { UID } from 'imap'
import type { Observable } from 'kefir'
import type { Readable } from 'stream'
import type { MessageRecord, QueryParams } from './types'

export async function createIndexes (db: PouchDB): Promise<void> {
  const indexes = [
    db.createIndex({
      index: {
        fields: ['message.date', 'type']
      },
      ddoc: 'conversationIds',
      name: 'conversationIds'
    }),
    db.createIndex({
      index: {
        fields: ['type', 'conversationId']
      },
      ddoc: 'messagesByConversation',
      name: 'messagesByConversation'
    }),
    db.createIndex({
      index: {
        fields: ['message.x-gm-thrid']
      },
      ddoc: 'messagesByGoogleThreadId',
      name: 'messagesByGoogleThreadId'
    }),
    pouchdbUtil.createDesignDocument(db, {
      _id: '_design/messages',
      views: {
        byUid: {
          map: `function (doc) {
            if ('perBoxMetadata' in doc) {
              doc.perBoxMetadata.forEach(function(meta) {
                emit([meta.boxName, meta.uidvalidity, meta.uid], 1);
              });
            }
          }`
        }
      }
    })
  ]
  await Promise.all(indexes)
}

export function queryConversations (
  params: QueryParams,
  db: PouchDB
): Observable<Message[], mixed> {
  const selector = buildSelector(params)
  const query: { [key: string]: any } = {
    fields: ['conversationId'],
    selector
  }

  // TODO: sorting currently only works if sorted field is selected according
  // to an inequality operation. That means the `$exists` operator is not
  // sufficient. See: https://github.com/pouchdb/pouchdb/issues/6266
  if (selector['message.date']) {
    query.sort = [{ 'message.date': 'desc' }]
  }

  return kefir
    .fromPromise(fetchConversationIds(query, db, params.limit))
    .flatMap(conversationIds => {
      const convs = conversationIds.map(id =>
        kefir.fromPromise(getConversationById(id, db))
      )
      return kefir.merge(convs) // build conversations in parallel
    })
}

// Fetch the first `limit` distinct conversation IDs that match the given query
async function fetchConversationIds (
  query: Object,
  db: PouchDB,
  limit: number = 30, // total number of distinct values to fetch
  skip: number = 0,
  ids: string[] = [] // IDs that have been fetched so far
): Promise<string[]> {
  const { docs } = await db.find({
    ...query,
    limit,
    skip
  })
  if (docs.length < 1) {
    return ids
  }
  const newIds = docs.map(doc => doc.conversationId)
  const updatedIds = unique(ids.concat(newIds))
  if (updatedIds.length >= limit) {
    return updatedIds.slice(0, limit)
  }
  return fetchConversationIds(query, db, limit, skip + limit, updatedIds)
}

export async function getConversation (
  uri: string,
  db: PouchDB
): Promise<Message[]> {
  const parsed = Msg.parseMidUri(uri)
  if (!parsed) {
    throw new Error(
      'cannot parse conversation URI according to `mid:` scheme: ' + uri
    )
  }
  const messageId = parsed.messageId
  const messageRecord = await db.get(messageId)
  return getConversationById(messageRecord.conversationId, db)
}

async function getConversationById (
  conversationId: string,
  db: PouchDB
): Promise<Message[]> {
  if (!conversationId) {
    throw new Error('Cannot fetch thread without a conversation ID')
  }
  const messageRecords = await getThread(conversationId, db)
  return messageRecords.map(asMessage)
}

export async function getMessage (id: string, db: PouchDB): Promise<Message> {
  const record = await db.get(id)
  return asMessage(record)
}

export async function getMessagesByThreadId (
  threadId: string,
  db: PouchDB
): Promise<Message[]> {
  if (!threadId) {
    throw new Error('Cannot fetch thread without a thread ID')
  }
  return getMessages(
    {
      selector: {
        'message.x-gm-thrid': threadId
      }
    },
    db
  )
}

export async function verifyExistenceUids (
  query: { boxName: string, uidvalidity: UID, uid: UID }[],
  db: PouchDB
): Promise<{ boxName: string, uidvalidity: UID, uid: UID }[]> {
  const result = await db.query('messages/byUid', {
    include_docs: false,
    keys: query.map(({ boxName, uidvalidity, uid }) => [
      boxName, uidvalidity, uid
    ])
  })
  return result.rows.map(row => row.key)
}

async function getMessages (query: Object, db: PouchDB): Promise<Message[]> {
  const result = await db.find(query)
  const messageRecords = result.docs
  return messageRecords.map(asMessage)
}

/*
 * Get all messages that reference or are referenced by the given message
 * (including the input message itself).
 */
async function getThread (
  conversationId: string,
  db: PouchDB
): Promise<MessageRecord[]> {
  const result = await db.find({
    selector: {
      type: 'Message',
      conversationId
    }
  })
  return result.docs
}

export function fetchPartContent (
  db: PouchDB,
  msg: Message,
  partRef: Part.PartRef
): Promise<Readable> {
  const part = msg.getPart(partRef)
  if (!part) {
    return Promise.reject(
      new Error(`No part with ID ${String(partRef)} for message ${msg.id}`)
    )
  }
  return db.getAttachment(msg.uriForPart(part), 'content').then(buffer => {
    const rs = new stream.PassThrough()
    rs.end(buffer)
    return rs
  })
}

// TODO: in case URI was constructed using a partID instead of a contentID, fall
// back to looking for a record with the matching partID
export function fetchContentByUri (db: PouchDB, uri: string): Promise<Readable> {
  return db.getAttachment(uri, 'content').then(buffer => {
    const rs = new stream.PassThrough()
    rs.end(buffer)
    return rs
  })
}

function buildSelector (params: QueryParams): Object {
  const { labels, mailingList, since } = params

  // if (labels instanceof Array) {
  //   selector['message.x-gm-labels'] = { $elemMatch: { $in: labels } }
  // }

  // if (typeof mailingList === 'string') {
  //   selector.headers = {
  //     ...(selector.headers || {}),
  //     { $elemMatch:  }
  //   }
  //   selector['headers'] = { $elemMatch:  }
  // }

  const dateRange =
    since && typeof since.toISOString === 'function'
      ? { $gte: since.toISOString().slice(0, 10) }
      : { $gt: null }

  return {
    type: 'Message',
    'message.date': dateRange
  }
}

function asMessage ({
  message,
  headers,
  perBoxMetadata
}: MessageRecord): Message {
  return new Message(message, new Map(headers), perBoxMetadata)
}
