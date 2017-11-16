/* @flow */

import { type MessagePart } from 'arfe/lib/models/MessagePart'
import * as kefir from 'kefir'
import type { Readable } from 'stream'
import * as cache from '../cache'
import { dbTask } from './basic'
import Task from './Task'

export function storeLocalCopyOfMessage (
  message: cache.MessageRecord,
  parts: { part: MessagePart, content: Readable }[]
): Task<void> {
  const contentTasks = parts.map(({ part, content }) =>
    dbTask(db =>
      kefir.fromPromise(cache.persistPart(message._id, part, content, db))
      .map(_ => {})
    )
  )
  return Task.seq(
    contentTasks.concat(
      dbTask(db => kefir.fromPromise(cache.persistMessageRecord(message, db)))
    )
  )
}
