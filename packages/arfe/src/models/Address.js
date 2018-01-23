/* @flow */

import * as addrs from 'email-addresses'
import { mailtoUri } from './uri'

import type { Address as ImapAddress } from 'imap'
import type { URI } from './uri'

export type Email = string

export default class Address {
  name: ?string
  mailbox: string
  host: string

  constructor (addr: ImapAddress) {
    this.name = addr.name
    this.mailbox = addr.mailbox
    this.host = addr.host
  }

  get displayName (): string {
    return this.name || this.email
  }

  get email (): Email {
    return `${this.mailbox}@${this.host}`
  }

  get headerValue (): string {
    return this.name ? `${this.name} <${this.email}>` : this.email
  }

  get uri (): URI {
    return mailtoUri(this.email)
  }
}

// TODO: normalize when comparing
export function equals (x: Address, y: Address): boolean {
  return x.email === y.email
}

export function build ({
  email,
  name
}: {
  email: string,
  name?: string
}): Address {
  const [mailbox, host] = email.split('@', 2)
  return name
    ? new Address({
      name,
      mailbox,
      host
    })
    : new Address({ mailbox, host })
}

const specialChar = /[()<>\[\]:;@\\,."]/

// Print an address according to RFC 5322
export function formatAddress (a: Address): string {
  const rawName = a.name
  if (!rawName) {
    return `${a.mailbox}@${a.host}`
  }
  const name = rawName.match(specialChar)
    ? '"' + rawName.replace(/"/g, '\\"') + '"'
    : rawName
  return `${name} <${a.mailbox}@${a.host}>`
}

// Print list of addresses as a single string according to RFC 5322
export function formatAddressList (as: Address[]): string {
  return as.map(formatAddress).join(', ')
}

// Parse a list of addresses according to RFC 5322
export function parseAddressList (as: ?string): ?(Address[]) {
  const results = addrs.parseAddressList(as)
  if (!results) {
    return results
  }
  return results.map(
    p =>
      new Address({
        name: p.name,
        mailbox: p.local,
        host: p.domain
      })
  )
}
