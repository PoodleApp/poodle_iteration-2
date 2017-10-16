/* @flow */

import * as AS from 'activitystrea.ms'
import * as imap from 'imap'
import * as mediaType from 'media-type'
import * as m from 'mori'
import * as uuid from 'node-uuid'
import Address from '../models/Address'
import Conversation from '../models/Conversation'
import * as asutil from '../util/activity'
import { type Content, type ID } from './types'

// TODO: remove references from list if necessary to keep length down (always
// keep at least first and last reference)
export function references (conversation: Conversation): string {
  return m.intoArray(m.map(id => `<${id}>`, conversation.references)).join(' ')
}

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
  disposition?: ?imap.Disposition
}): imap.MessagePart {
  const { type, subtype, suffix, parameters } = mediaType.fromString(
    content.mediaType
  )
  const part: imap.MessagePart = {
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
  return `${uuid.v4()}@${host}`
}

/* formatting helpers */

export function envelopeAddresses (addrs: m.Seqable<Address>): imap.Address[] {
  return m.intoArray(
    m.map(({ name, mailbox, host }) => ({ name, mailbox, host }))
  )
}

export function headerAddresses (
  addrs: m.Seqable<Address>
): { value: { address: string, name: ?string }[] } {
  const value = m.intoArray(
    m.map(addr => ({ name: addr.name, address: addr.email }))
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
