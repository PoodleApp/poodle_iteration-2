/*
 * Functions to send requests to an ImapInterface over some channel.
 *
 * @flow
 */

import Message from 'arfe/lib/models/Message'
import type EventEmitter from 'events'
import * as imap from 'imap'
import * as kefir from 'kefir'
import * as capabilities from '../capabilities'
import { type ImapAccount } from '../models/ImapAccount'
import { type AccountMetadata, type Email } from '../types'
import * as channel from './channel'
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

export default class Client {
  _accounts: kefir.Observable<AccountMetadata[]>
  _channel: EventEmitter

  constructor (channel: EventEmitter) {
    this._channel = channel
    this._accounts = kefir.stream(emitter => {
      function listener (accounts: AccountMetadata[]) {
        emitter.value(accounts)
      }
      channel.addListener(constants.ACCOUNT_LIST, listener)

      // Request up-to-date list from Server
      request(accountAction(accountActions.list()))

      return function unsubscribe () {
        channel.removeListener(constants.ACCOUNT_LIST, listener)
      }
    })
  }

  addAccount (account: ImapAccount): kefir.Observable<void> {
    return request(accountAction(accountActions.add(account)))
  }

  /*
   * Lists connected IMAP accounts. This observable never ends - it emits an
   * up-to-date list every time an account is added or removed.
   */
  accounts (): kefir.Observable<AccountMetadata[]> {
    return this._accounts
  }

  search (opts: {
    account: Email,
    box: string,
    criteria: mixed[],
    capabilities?: string[]
  }): kefir.Observable<imap.UID[]> {
    return request(imapAction(imapActions.search(opts), opts.account))
  }
}

function request<T> (action: Action): kefir.Observable<T> {
  return channel.request(action)
}
