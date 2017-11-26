/* @flow */

import type { MessagePart as ImapMessagePart } from 'imap'

export type MessagePart = ImapMessagePart

export const CONTENT_ID = 'contentId'
export const PART_ID = 'partId'

export type PartRef =
  | { type: typeof CONTENT_ID, contentId: string }
  | { type: typeof PART_ID, partId: string }

export function contentId(id: string): PartRef {
  return { type: CONTENT_ID, contentId: id }
}

export function partId(id: string): PartRef {
  return { type: PART_ID, partId: id }
}

export function charset (part: MessagePart): ?string {
  return part.params && part.params.charset
}

export function contentType (part: MessagePart): string {
  if (!part.subtype) {
    // TODO: My observations so far indicate that if there is no value for
    // `subtype`, then the type is `multipart`, and the value given for `type`
    // is actually the subtype.
    return `multipart/${part.type}`
  }

  const baseType = `${part.type}/${part.subtype}`
  const cs = charset(part)
  return cs
    ? `${baseType}; charset=${cs}`
    : baseType
}

export function disposition (part: MessagePart): ?string {
  return part.disposition && part.disposition.type
}

export function filename (part: MessagePart): ?string {
  const params = part.disposition && part.disposition.params
  if (params) {
    return params.filename
  }
}

export function isMultipart (part: MessagePart): boolean {
  return !part.subtype
}
