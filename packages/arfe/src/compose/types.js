/* @flow */

import { type Readable } from 'stream'

// Type that is passed to nodemailer
export type MessageConfiguration = {
  alternatives?: ContentPart[],
  attachments?: Attachment[],
  envelope?: Envelope,
  html?: Content,
  messageId?: string,
  raw?: Content,
  text?: Content
}

type ContentPart = {
  contentType: string,
  content: Content
}

type Attachment = {
  cid?: string,
  contentType?: string,
  content?: Content,
  disposition?: string,
  filename?: string,
  path?: string
}

type Content = string | Buffer | Readable

type Envelope = {
  from: string,
  to: string[],
  cc?: string[],
  bcc?: string[]
}
