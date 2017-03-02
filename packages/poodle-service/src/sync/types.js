/* @flow */

import Connection from 'imap'

import type { MessageAttributes, MessagePart } from 'imap'

export type QueryParams       = { [key: string]: any }
export type ConnectionFactory = () => Promise<Connection>

export type MessageRecord = {
  _id:        string,
  _rev?:      string,
  headers:    Array<[string, any]>,
  message:    MessageAttributes,
  messageIds: string[],
  type:       'Message',
}

export type PartRecord = {
  _id:          string,
  _rev?:        string,
  _attachments: {
    content: {
      content_type: string,
      data?:        Buffer,
      digest?:      string,
      stub?:        true,
    },
  },
  part: MessagePart,
  type: 'PartContent',
}
