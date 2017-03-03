/* @flow */

import Conversation, * as Conv from 'arfe/lib/models/Conversation'
import Message                 from 'arfe/lib/models/Message'
import * as kefir              from 'kefir'
import PouchDB                 from 'pouchdb-node'
import stream                  from 'stream'

import type { Observable }                 from 'kefir'
import type { Readable }                   from 'stream'
import type { MessageRecord, QueryParams } from './types'

// export function createIndexes(db: PouchDB) {
//   TODO
// }

export function queryConversations(params: QueryParams, db: PouchDB): Observable<Conversation, mixed> {
  return kefir.fromPromise(db.find({
    selector: buildSelector(params),
    fields:   ['messageIds'],
    limit:    params.limit || 100,
  }))
    .flatMap(matchingMessages => {
      const threads = matchingMessages.docs.map(
        message => kefir.fromPromise(getThread(message, db))
      )
      return kefir.merge(threads)  // build convs in parallel
    })
    .skipDuplicates((a, b) => a[0]._id === b[0]._id)  // avoid processing each conv more than once
    .flatMap(thread => {
      const messages = thread.map(asMessage)
      return kefir.fromPromise(
        Conv.messagesToConversation(fetchPartContent.bind(null, db), messages)
      )
    })
}

/*
 * Get all messages that reference or are referenced by the given message
 * (including the input message itself).
 */
function getThread(message: MessageRecord, db: PouchDB): Promise<MessageRecord[]> {
  return db.find({
    selector: {
      messageIds: {
        $elemMatch: { $in: message.messageIds },
      },
      type: 'Message',
    },
    sort: ['_id'],
  })
    .then(result => result.docs)
}

function fetchPartContent(db: PouchDB, msg: Message, partId: string): Promise<Readable> {
  return db.getAttachment(msg.uriForPartId(partId), 'content')
    .then(buffer => {
      const rs = new stream.PassThrough()
      rs.end(buffer)
      return rs
    })
}

export function fetchContentByUri(db: PouchDB, uri: string): Promise<Readable> {
  return db.getAttachment(uri, 'content')
    .then(buffer => {
      const rs = new stream.PassThrough()
      rs.end(buffer)
      return rs
    })
}

function buildSelector(params: QueryParams): Object {
  const { labels, mailingList, since } = params
  const selector: { [key: string]: any } = {
    type: 'Message'
  }

  if (labels instanceof Array) {
    selector.message = {
      ...(selector.message || {}),
      'x-gm-labels': { $elemMatch: { $in: labels } },
    }
  }

  // if (typeof mailingList === 'string') {
  //   selector.headers = {
  //     ...(selector.headers || {}),
  //     { $elemMatch:  }
  //   }
  //   selector['headers'] = { $elemMatch:  }
  // }

  if (since instanceof Date) {
    selector.message = {
      ...(selector.message || {})
    }
    selector['message.date'] = { $gte: since }
  }

  return selector
}

function asMessage({ message, headers }: MessageRecord): Message {
  return new Message(message, new Map(headers))
}

function angleBrackets(str: string): string {
  return `<${str}>`
}
