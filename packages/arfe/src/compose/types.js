/* @flow */

import { type Seqable } from 'mori'
import { type Readable } from 'stream'
import Address from '../models/Address'
import type Conversation from '../models/Conversation'
import type Message from '../models/Message'
import { type URI } from '../models/uri'

export type ID = string

export type Content = {
  id?: string,
  mediaType: string,
  stream: Readable
}

// Type that is passed to nodemailer
export type MessageConfiguration = {
  alternatives?: ContentPart[],
  attachments?: Attachment[],
  envelope?: Envelope,
  html?: MailerContent,
  messageId?: string,
  raw?: MailerContent,
  text?: MailerContent
}

// Type accepted by builders that build `Message` values
export type MessageParams = {
  date?: ?Date,
  from: Seqable<Address>,
  to: Seqable<Address>,
  cc?: ?Seqable<Address>,
  bcc?: ?Seqable<Address>,
  subject?: ?string,
  conversation?: ?Conversation
}

type ContentPart = {
  contentType: string,
  content: MailerContent
}

type Attachment = {
  cid?: string,
  contentType?: string,
  content?: MailerContent,
  disposition?: string,
  filename?: string,
  path?: string
}

type MailerContent = string | Buffer | Readable

type Envelope = {
  from: string,
  to: string[],
  cc?: string[],
  bcc?: string[]
}
