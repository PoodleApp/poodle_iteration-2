/* @flow */

import Message         from 'arfe/lib/models/Message'
import PouchDB         from 'pouchdb-node'
import streamToPromise from 'stream-to-promise'

import type { ReadStream }                from 'fs'
import type { MessagePart }               from 'imap'
import type { MessageRecord, PartRecord } from './types'

export async function persistMessage(db: PouchDB, message: Message): Promise<void> {
  const existing = await db.get(message.id).catch(err => {
    if (err.status !== 404) { return Promise.reject(err) }
  })
  const record: MessageRecord = {
    _id:        message.id,
    type:       'Message',
    message:    message.attributes,
    messageIds: getMessageIds(message),
    headers:    Array.from(message.headers.entries()),
  }
  if (existing) {
    record._rev = existing._rev
  }
  return db.put(record).then(_ => undefined)
}

export async function persistPart(db: PouchDB, message: Message, part: MessagePart, data: ReadStream): Promise<void> {
  const _id = message.uriForPart(part)
  const existing = await db.get(_id).catch(err => {
    if (err.status !== 404) { return Promise.reject(err) }
  })
  if (existing) { return }

  const buffer = await streamToPromise(data)

  const { type, subtype } = part
  if (!type || !subtype) {
    throw new Error("cannot persist part content without MIME subtype")
  }

  const record: PartRecord = {
    _id,
    _attachments: {
      content: {
        content_type: `${type}/${subtype}`,
        data: buffer,
      },
    },
    part,
    type: 'PartContent',
  }
  return db.put(record)
}

function getMessageIds(message: Message): string[] {
  return message.references.concat(message.id)
}
