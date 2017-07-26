/* @flow */

import Conversation, * as Conv from 'arfe/lib/models/Conversation'
import Message, * as Msg from 'arfe/lib/models/Message'
import * as kefir from 'kefir'
import PouchDB from 'pouchdb-node'
import stream from 'stream'

import type { Observable } from 'kefir'
import type { Readable } from 'stream'
import type { MessageRecord, QueryParams } from './types'

export function createIndexes (db: PouchDB): Promise<void> {
  const indexes = [
    db.createIndex({
      index: {
        fields: ['message.date', 'type']
      }
    }),
    db.createIndex({
      index: {
        fields: ['_id', 'messageIds', 'type']
      }
    })
  ]
  return Promise.all(indexes).then(_ => undefined)
}

export function queryConversations (
  params: QueryParams,
  db: PouchDB
): Observable<Conversation, mixed> {
  const selector = buildSelector(params)
  const query: { [key: string]: any } = {
    fields: ['messageIds'],
    limit: params.limit || 30,
    selector
  }

  // TODO: sorting currently only works if sorted field is selected according
  // to an inequality operation. That means the `$exists` operator is not
  // sufficient. See: https://github.com/pouchdb/pouchdb/issues/6266
  if (selector['message.date']) {
    query.sort = [{ 'message.date': 'desc' }]
  }

  return kefir
    .fromPromise(db.find(query))
    .flatMap(matchingMessages => {
      const threads = matchingMessages.docs.map(({ messageIds }) =>
        kefir.fromPromise(getThread(messageIds, db))
      )
      return kefir.merge(threads) // build convs in parallel
    })
    .skipDuplicates((a, b) => a[0]._id === b[0]._id) // avoid processing each conv more than once
    .flatMap(thread => {
      const messages = thread.map(asMessage)
      return kefir.fromPromise(
        Conv.messagesToConversation(fetchPartContent.bind(null, db), messages)
      )
    })
}

export async function getConversation (
  uri: string,
  db: PouchDB
): Promise<Conversation> {
  const parsed = Msg.parseMidUri(uri)
  if (!parsed) {
    throw new Error(
      'cannot parse conversation URI according to `mid:` scheme: ' + uri
    )
  }
  const messageId = parsed.messageId
  const messageRecord = await db.get(messageId)
  const messageRecords = await getThread(messageRecord.messageIds, db)
  const messages = messageRecords.map(asMessage)
  return Conv.messagesToConversation(fetchPartContent.bind(null, db), messages)
}

/*
 * Get all messages that reference or are referenced by the given message
 * (including the input message itself).
 */
function getThread (
  messageIds: string[],
  db: PouchDB
): Promise<MessageRecord[]> {
  return db
    .find({
      selector: {
        messageIds: {
          $elemMatch: { $in: messageIds }
        },
        type: 'Message'
      },
      sort: ['_id']
    })
    .then(result => result.docs)
}

function fetchPartContent (
  db: PouchDB,
  msg: Message,
  partId: string
): Promise<Readable> {
  return db.getAttachment(msg.uriForPartId(partId), 'content').then(buffer => {
    const rs = new stream.PassThrough()
    rs.end(buffer)
    return rs
  })
}

export function fetchContentByUri (db: PouchDB, uri: string): Promise<Readable> {
  return db.getAttachment(uri, 'content').then(buffer => {
    const rs = new stream.PassThrough()
    rs.end(buffer)
    return rs
  })
}

function buildSelector (params: QueryParams): Object {
  const { labels, mailingList, since } = params
  const selector: { [key: string]: any } = {
    type: 'Message'
  }

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

  if (typeof since === 'string') {
    selector['message.date'] = { $gte: since }
  }

  return selector
}

function asMessage ({ message, headers }: MessageRecord): Message {
  return new Message(message, new Map(headers))
}

function angleBrackets (str: string): string {
  return `<${str}>`
}
