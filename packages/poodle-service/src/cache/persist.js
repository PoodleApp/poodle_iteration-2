/* @flow */

import Message, * as Msg from 'arfe/lib/models/Message'
import { type URI, midUri } from 'arfe/lib/models/uri'
import { immutable as unique } from 'array-unique'
import PouchDB from 'pouchdb-node'
import streamToPromise from 'stream-to-promise'
import * as pouchdbUtil from '../util/pouchdb'

import type { Box, MessagePart } from 'imap'
import type { Readable } from 'stream'
import type { MessageRecord, PartRecord } from './types'

type ID = string

export async function persistMessage (
  message: Message,
  db: PouchDB
): Promise<void> {
  return persistMessageRecord(messageToRecord(message))
}

export async function persistMessageRecord (
  message: MessageRecord,
  db: PouchDB
): Promise<void> {
  const requestedAt = toISOStringSecondPrecision(new Date())
  await pouchdbUtil.update(db, (existing: ?MessageRecord) => {
    return {
      _id: message._id,
      conversationId: message.conversationId,
      headers: message.headers,
      message: message.message,
      perBoxMetadata: mergePerBoxMetadata(
        existing && existing.perBoxMetadata,
        message && message.perBoxMetadata
      ),
      requestedAt,
      type: 'Message'
    }
  })
}

export function messageToRecord(message: Message): MessageRecord {
  const headers = Array.from(message.headers.entries())
  const requestedAt = toISOStringSecondPrecision(new Date())
  return {
    _id: message.id,
    conversationId: message.conversationId,
    headers: headers,
    message: message.attributes,
    perBoxMetadata: message.perBoxMetadata || [],
    requestedAt,
    type: 'Message'
  }
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
  const existing = await pouchdbUtil.maybeGet(db, _id)
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
  try {
    await db.put(record)
  } catch (err) {
    if (err.status !== 409) {
      throw err
    }
  }
  return _id
}

function mergePerBoxMetadata (
  existing: ?(Msg.PerBoxMetadata[]),
  update: ?(Msg.PerBoxMetadata[])
): Msg.PerBoxMetadata[] {
  existing = existing || []
  update = update || []
  const firstUpdate = update[0]
  const uidvalidity = firstUpdate && firstUpdate.uidvalidity
  const merged = []
  for (const meta of update.concat(existing)) {
    if (meta.uidvalidity === uidvalidity && !merged.some(({ boxName, uid }) => (
      boxName === meta.boxName && uid === meta.uid
    ))) {
      merged.push(meta)
    }
  }
  return merged
}

function toISOStringSecondPrecision (date: Date): string {
  return date.toISOString().slice(0, 19) + 'Z'
}
