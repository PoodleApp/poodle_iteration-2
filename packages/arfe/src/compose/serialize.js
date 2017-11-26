/* @flow strict */

import BuildMail from 'buildmail'
import type { MessagePart, MessageStruct } from 'imap'
import * as m from 'mori'
import { type Readable } from 'stream'
import type Address from '../models/Address'
import Message, * as Msg from '../models/Message'
import * as Part from '../models/MessagePart'
import { type MessageConfiguration } from './types'

export async function serialize (
  fetchPartContent: (msg: Message, partRef: Part.PartRef) => Promise<Readable>,
  message: Message
): Promise<MessageConfiguration> {
  async function fetchContent (partRef: Part.PartRef): Promise<?Readable> {
    try {
      return await fetchPartContent(message, partRef)
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

export async function serializeFromContentMap ({
  message,
  parts
}: {
  message: Message,
  parts: { part: MessagePart, content: Readable }[]
}): Promise<MessageConfiguration> {
  async function fetcher (msg: Message, partRef: Part.PartRef): Promise<Readable> {
    // The `parts` structure does not have partID values, but `message` does. In
    // case the ref that is given is a partID we look up the part in `message`,
    // get the `contentID`, and use that to look up the part in `parts`.
    const msgPart = message.getPart(partRef)
    const contentId = msgPart && msgPart.id
    const partWithContent = contentId && parts.find(
      ({ part }) => part.id === contentId
    )
    if (!partWithContent) {
      throw new Error(`unable to find part ${String(partRef)}`)
    }
    return partWithContent.content
  }
  return serialize(fetcher, message)
}

async function nodesFromStruct (
  fetchContent: (partRef: Part.PartRef) => Promise<?Readable>,
  struct: MessageStruct
): Promise<BuildMail> {
  const part: MessagePart = (struct[0]: any)
  const rest: MessageStruct[] = (struct.slice(1): any)

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

  const content = part.partID && (await fetchContent(Part.partId(part.partID)))
  if (content) {
    node.setContent(content)
  }

  const children = await Promise.all(
    rest.map(nodesFromStruct.bind(null, fetchContent))
  )
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
  root.setHeader(name, processHeaderValue(value))
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
  return typeof value === 'string' && !!value.match(dateFormat)
}
