/* @flow */

import { type MessagePart } from 'arfe/lib/models/MessagePart'
import * as kefir from 'kefir'
import type { Readable } from 'stream'
import * as cache from '../cache'
import { dbTask } from './basic'
import Task from './Task'

export function storeLocalCopyOfMessage (
  message: cache.MessageRecord,
  content: { part: MessagePart, data: Readable }[]
): Task<void> {
  const contentTasks = content.map(({ part, data }) =>
    dbTask(db =>
      kefir.fromPromise(cache.persistPart(message._id, part, data, db))
      .map(_ => {})
    )
  )
  return Task.seq(
    contentTasks.concat(
      dbTask(db => kefir.fromPromise(cache.persistMessageRecord(message, db)))
    )
  )
}
