/* @flow */

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
