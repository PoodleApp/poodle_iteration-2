/* @flow */

import Message, * as Msg from 'arfe/lib/models/Message'
import { type URI, midUri } from 'arfe/lib/models/uri'
import PouchDB from 'pouchdb-node'
import streamToPromise from 'stream-to-promise'

import type { Box, MessagePart } from 'imap'
import type { Readable } from 'stream'
import type { MessageRecord, PartRecord } from './types'

type ID = string

export async function persistMessage (
  message: Message,
  db: PouchDB
): Promise<void> {
  const existing = await db.get(message.id).catch(err => {
    if (err.status !== 404) {
      return Promise.reject(err)
    }
  })
  const record: MessageRecord = {
    _id: message.id,
    conversationId: message.conversationId,
    headers: Array.from(message.headers.entries()),
    message: message.attributes,
    perBoxMetadata: mergePerBoxMetadata(
      existing.perBoxMetadata,
      message.perBoxMetadata
    ),
    requestedAt: new Date().toISOString(),
    type: 'Message'
  }
  if (existing) {
    record._rev = existing._rev
  }
  return db.put(record).then(_ => undefined)
}

/*
 * Emits ID of part record in PouchDB
 */
export async function persistPart (
  messageId: string,
  part: MessagePart,
  data: Readable,
  db: PouchDB
): Promise<ID> {
  const _id = midUri(messageId, part.id || part.partID) // prefer content ID over part ID
  const existing = await db.get(_id).catch(err => {
    if (err.status !== 404) {
      return Promise.reject(err)
    }
  })
  if (existing) {
    return _id
  }

  const buffer = await streamToPromise(data)

  const { type, subtype } = part
  if (!type || !subtype) {
    throw new Error('cannot persist part content without MIME subtype')
  }

  const record: PartRecord = {
    _id,
    _attachments: {
      content: {
        content_type: `${type}/${subtype}`,
        data: buffer
      }
    },
    part,
    requestedAt: new Date().toISOString(),
    type: 'PartContent'
  }
  await db.put(record)
  return _id
}

type PerBoxMap = { [key: string]: Msg.PerBoxMetadata }

function mergePerBoxMetadata (
  existing: ?PerBoxMap,
  update: ?PerBoxMap
): PerBoxMap {
  return {
    ...existing,
    ...update
  }
}
