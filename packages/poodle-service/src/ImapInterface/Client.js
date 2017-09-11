/*
 * Functions to send requests to an ImapInterface over some channel.
 *
 * @flow
 */

import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import Message from 'arfe/lib/models/Message'
import type EventEmitter from 'events'
import * as imap from 'imap'
import * as kefir from 'kefir'
import * as capabilities from '../capabilities'
import { type ImapAccount } from '../models/ImapAccount'
import { type AccountMetadata, type Email } from '../types'
import * as C from './channel'
import { type Action, accountAction, imapAction } from './actions'
import * as accountActions from './actions/account'
import * as imapActions from './actions/imap'
import * as constants from './constants'

// export function fetchMessagePart (
//   box: string,
//   msg: Message,
//   partID: string,
//   channel: EventEmitter
// ): Promise<Readable> {
//   return request(imapActions.fetchParts(box, source), channel)
// }

// export function search (box: string, criteria: mixed[], channel: EventEmitter): Promise<imap.UID[]> {
//   return request(imapActions.search(box, criteria), channel)
// }

// export function gmailSearch (box: string, query: string): Promise<imap.UID[]> {
//   return search(box, [['X-GM-RAW', query]], [capabilities.googleExtensions])
// }

export type Content = {
  content: string,
  mediaType: string
}

export opaque type Client = {
  accounts: kefir.Observable<AccountMetadata[]>,
  channel: EventEmitter
}

export function NewClient (channel: EventEmitter): Client {
  /*
   * Lists connected IMAP accounts. This observable never ends - it emits an
   * up-to-date list every time an account is added or removed.
   */
  const accounts: kefir.Observable<
    AccountMetadata[]
  > = kefir.stream(emitter => {
    function listener (value: AccountMetadata[]) {
      emitter.value(value)
    }
    channel.addListener(constants.ACCOUNT_LIST, listener)

    // Request up-to-date list from Server
    C.request(accountAction(accountActions.list()), channel)

    return function unsubscribe () {
      channel.removeListener(constants.ACCOUNT_LIST, listener)
    }
  })

  return {
    accounts,
    channel
  }
}

export function accounts (client: Client): kefir.Observable<AccountMetadata[]> {
  return client.accounts
}

export function activityContent (
  activity: DerivedActivity,
  accountName: Email,
  client: Client
): kefir.Observable<?Content> {
  return kefir.constantError(new Error('TODO: activityContent')) // TODO
}

export function activityContentSnippet (
  activity: DerivedActivity,
  accountName: Email,
  client: Client
): kefir.Observable<?Content> {
  return kefir.constantError(new Error('TODO: activityContentSnippet')) // TODO
}

export function addAccount (account: ImapAccount, client: Client): kefir.Observable<void> {
  return request(accountAction(accountActions.add(account)), client)
}

export function search (opts: {
  account: Email,
  box: string,
  criteria: mixed[],
  capabilities?: string[]
}, client: Client): kefir.Observable<imap.UID[]> {
  return request(imapAction(imapActions.search(opts), opts.account), client)
}

function request<T> (action: Action, client: Client): kefir.Observable<T> {
  return C.request(action, client.channel)
}
