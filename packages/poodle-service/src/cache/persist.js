/* @flow */

import Message, * as Msg from 'arfe/lib/models/Message'
import * as Part from 'arfe/lib/models/MessagePart'
import { type URI, midUri } from 'arfe/lib/models/uri'
import { immutable as unique } from 'array-unique'
import streamToBlob from 'stream-to-blob'
import * as DB from './indexeddb'

import type { Box, MessagePart } from 'imap'
import type { Readable } from 'stream'
import type {
  BoxName,
  ImapLocation,
  MessageRecord,
  PartRecord,
  UIDValidity
} from './types'

type ID = string

export async function persistMessage (
  message: Message,
  imapLocations: ImapLocation[],
  db: DB.DB
): Promise<void> {
  return persistMessageRecord(messageToRecord(message, imapLocations), db)
}

export async function persistMessageRecord (
  message: MessageRecord,
  db: DB.DB
): Promise<void> {
  const requestedAt = new Date()
  await DB.transaction(db, ['messages'], 'readwrite', messages =>
    DB.update(messages, (existing: ?MessageRecord) => ({
      _id: message._id,
      conversationId: message.conversationId,
      headers: message.headers,
      message: message.message,
      imapLocations: mergeImapLocations(
        existing ? existing.imapLocations : [],
        message ? message.imapLocations : []
      ),
      requestedAt,
      type: 'Message'
    }))
  )
}

export function messageToRecord (
  message: Message,
  imapLocations: ImapLocation[] = []
): MessageRecord {
  const headers = Array.from(message.headers.entries())
  const requestedAt = new Date()
  return {
    _id: message.id,
    conversationId: message.conversationId,
    headers: headers,
    message: message.attributes,
    imapLocations,
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
  db: DB.DB
): Promise<ID> {
  const _id = midUri(messageId, part.id || part.partID) // prefer content ID over part ID
  const existingCount = await DB.transaction(
    db,
    ['messageParts'],
    'readonly',
    messageParts => DB.count(messageParts, DB.IDBKeyRange.only(_id))
  )
  if (existingCount > 0) {
    return _id
  }

  const contentType = Part.contentType(part)
  const blob = await new Promise((resolve, reject) => {
    streamToBlob(data, contentType, (err, b) => {
      if (err) {
        reject(err)
      } else {
        resolve(b)
      }
    })
  })

  const record: PartRecord = {
    _id,
    content: blob,
    part,
    requestedAt: new Date(),
    type: 'PartContent'
  }

  await DB.transaction(db, ['messageParts'], 'readwrite', messageParts =>
    DB.put(messageParts, record)
  )
  return _id
}

function mergeImapLocations (
  existing: ImapLocation[],
  update: ImapLocation[]
): ImapLocation[] {
  const locationsInOtherBoxes = existing.filter(
    ([boxName, _, __]) => !update.some(([b, _, __]) => boxName === b)
  )
  return locationsInOtherBoxes.concat(update)
}
