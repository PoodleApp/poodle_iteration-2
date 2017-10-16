/* @flow */

import BuildMail from 'buildmail'
import * as imap from 'imap'
import { type Readable } from 'stream'
import type Address from '../models/Address'
import Message, * as Msg from '../models/Message'
import * as Part from '../models/MessagePart'
import { type MessageConfiguration } from './types'

export default async function serialize (
  fetchPartContent: (msg: Message, partId: string) => Promise<Readable>,
  message: Message
): Promise<MessageConfiguration> {
  async function fetchContent (partId: string): Promise<?Readable> {
    try {
      return await fetchPartContent(message, partId)
    } catch (_) {
      /* return `undefined` */
    }
  }

  const root = await nodesFromStruct(fetchContent, message.attributes.struct)
  root.setHeader('Date', message.receivedDate.toDate())

  writeHeaders(message.headers, root)

  return {
    envelope: root.getEnvelope(), // TODO: generate envelope from `message.attributes.envelope`
    raw: root.createReadStream()
  }
}

async function nodesFromStruct (
  fetchContent: (partId: string) => Promise<?Readable>,
  struct: imap.MessageStruct
): Promise<BuildMail> {
  const part: imap.MessagePart = (struct[0]: any)
  const rest: imap.MessageStruct[] = (struct.slice(1): any)

  const node = new BuildMail(Part.contentType(part), {
    disableFileAccess: true,
    disableUrlAccess: true,
    filename: Part.filename(part)
  })

  if (part.id) {
    node.setHeader('Content-ID', part.id)
  }

  const disposition = Part.disposition(part)
  if (disposition) {
    node.setHeader('Content-Disposition', disposition)
  }

  const content = part.partID && (await fetchContent(part.partID))
  if (content) {
    node.setContent(content)
  }

  const children = rest.map(nodesFromStruct.bind(null, fetchContent))
  for (const child of children) {
    node.appendChild(child)
  }

  return node
}

const headersWhitelist = [
  'from',
  'to',
  'cc',
  'bcc',
  'date',
  'in-reply-to',
  'reply-to',
  'references',
  'message-id',
  'subject'
]

function writeHeaders (headers: Msg.Headers, root: BuildMail) {
  for (const [key, value] of headers) {
    if (headersWhitelist.includes(key.toLowerCase())) {
      writeHeader(key, value, root)
    }
  }
}

function writeHeader (name: string, value: Msg.HeaderValue, root: BuildMail) {
}

function processHeaderValue (value: Msg.HeaderValue): mixed {
  if (value && value.value) {
    return value.value
  } else if (isDate(value)) {
    return new Date(value)
  } else {
    return value
  }
}

const dateFormat = /^\d{4}-\d{2}-\d{2}T.*/

function isDate (value: Msg.HeaderValue): boolean %checks {
  return (typeof value === 'string') && !!value.match(dateFormat)
}
