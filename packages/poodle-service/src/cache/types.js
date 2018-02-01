/* @flow */

import type { Flag, MessageAttributes, MessagePart, UID } from 'imap'

export type BoxName = string
export type UIDValidity = UID

export type QueryParams = { [key: string]: any }

export type BoxRecord = {
  _id: string,
  flags: Flag[],
  name: string,
  persistentUIDs: boolean,
  uidnext: number,
  uidvalidity: number
}

export type ImapLocation = [BoxName, UIDValidity, UID]

export type MessageRecord = {
  _id: string,
  conversationId: string, // First item in references header, or message ID
  headers: Array<[string, any]>,
  message: MessageAttributes,
  imapLocations: ImapLocation[],
  requestedAt: Date, // used for cache invalidation
  type: 'Message'
}

export type PartRecord = {
  _id: string,
  content: Blob,
  part: MessagePart,
  requestedAt: Date, // used for cache invalidation
  type: 'PartContent'
}

// NOTE: `requestedAt` times indicate time when a message or part was most
// recently relevent - at least as best as could be determined when the record
// was last updated. For example, a reply to a conversation causes all prior
// messages and parts in the same conversation to get a `requestedAt` time that
// matches the delivery time of the new message.
