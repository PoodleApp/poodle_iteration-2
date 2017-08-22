/* @flow */

import Connection from 'imap'

import type { Flag, MessageAttributes, MessagePart } from 'imap'

export type QueryParams = { [key: string]: any }
export type ConnectionFactory = () => Promise<Connection>

export type BoxRecord = {
  _id: string,
  _rev?: string,
  flags: Flag[],
  name: string,
  persistentUIDs: boolean,
  uidnext: number,
  uidvalidity: number
}

export type MessageRecord = {
  _id: string,
  _rev?: string,
  conversationId: string,
  headers: Array<[string, any]>,
  message: MessageAttributes,
  requestedAt: string, // ISO-8601, used for cache invalidation
  type: 'Message'
}

export type PartRecord = {
  _id: string,
  _rev?: string,
  _attachments: {
    content: {
      content_type: string,
      data?: Buffer,
      digest?: string,
      stub?: true
    }
  },
  part: MessagePart,
  requestedAt: string, // ISO-8601, used for cache invalidation
  type: 'PartContent'
}

// NOTE: `requestedAt` times indicate time when a message or part was most
// recently relevent - at least as best as could be determined when the record
// was last updated. For example, a reply to a conversation causes all prior
// messages and parts in the same conversation to get a `requestedAt` time that
// matches the delivery time of the new message.
