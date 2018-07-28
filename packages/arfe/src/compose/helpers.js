/* @flow strict */

import * as AS from 'activitystrea.ms'
import type { Address as ImapAddress, Disposition, MessagePart } from 'imap'
import * as mediaType from 'media-type'
import * as m from 'mori'
import uuid from 'uuid/v4'
import Address from '../models/Address'
import Conversation from '../models/Conversation'
import * as asutil from '../util/activity'
import { type Content, type ID } from './types'

export function buildActivityContent (activity: AS.models.Activity): Content {
  return {
    mediaType: 'application/activity+json',
    stream: asutil.createReadStream(activity)
  }
}

export function buildContentPart ({
  content,
  id,
  disposition
}: {
  content: Content,
  id: ID,
  disposition?: ?Disposition
}): MessagePart {
  const { type, subtype, suffix, parameters } = mediaType.fromString(
    content.mediaType
  )
  const part: MessagePart = {
    type,
    subtype: suffix ? [subtype, suffix].join('+') : subtype,
    params: parameters,
    id
  }
  if (disposition) {
    part.disposition = disposition
  }
  return part
}

export function getUniqueId (senderEmail?: Address) {
  const host = senderEmail ? senderEmail.host : ''
  return `${uuid()}@${host}`
}

/* formatting helpers */

export function envelopeAddresses (addrs: m.Seqable<Address>): ImapAddress[] {
  return m.intoArray(
    m.map(
      ({ name, mailbox, host }) =>
        name ? { name, mailbox, host } : { mailbox, host },
      addrs
    )
  )
}

export function headerAddresses (
  addrs: m.Seqable<Address>
): { value: { address: string, name: ?string }[] } {
  const value = m.intoArray(
    m.map(addr => ({ name: addr.name, address: addr.email }), addrs)
  )
  return { value }
}

export function idToHeaderValue (id: string): string {
  if (id.startsWith('<') && id.endsWith('>')) {
    return id
  } else {
    return `<${id}>`
  }
}

// TODO: remove references from list if necessary to keep length down (always
// keep at least first and last reference)
export function idsToHeaderValue (ids: m.Seqable<string>): string {
  return m.intoArray(m.map(id => `<${id}>`, ids)).join(' ')
}
