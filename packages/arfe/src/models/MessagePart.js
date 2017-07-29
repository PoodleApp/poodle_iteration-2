/* @flow */

import type { MessagePart as ImapMessagePart } from 'imap'

export type MessagePart = ImapMessagePart

export function contentType(part: MessagePart): string {
  if (!part.subtype) {
    // TODO: My observations so far indicate that if there is no value for
    // `subtype`, then the type is `multipart`, and the value given for `type`
    // is actually the subtype.
    return `multipart/${part.type}`
  }

  return `${part.type}/${part.subtype}`
}
