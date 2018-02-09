/*
 * `AccountService` handles serialized requests over some channel to add or
 * remove IMAP accounts from the active account list, send requests to an IMAP
 * account, or to send messages via SMTP. The purpose of this service is to
 * limit the number of IMAP connections that must be made, and to track accounts
 * that the user has signed into.
 *
 * @flow
 */

import type EventEmitter from 'events'
import * as kefir from 'kefir'
import { type Action as AccountAction } from './actions'
import { type Action as ImapAction } from '../request/actions'
import * as smtp from '../smtp'
import { type Action as SmtpAction } from '../smtp/actions'
import { type State as TaskState } from '../tasks/types'
import AccountManager from './AccountManager'
import perform from './perform'

const ACCOUNT_ACTION = 'accountAction'
const IMAP_ACTION = 'imapAction'
const SMTP_ACTION = 'smtpAction'

export type Action<T> =
  | { type: typeof ACCOUNT_ACTION, accountAction: AccountAction<T> }
  | { type: typeof IMAP_ACTION, imapAction: ImapAction<T>, state: TaskState }
  | { type: typeof SMTP_ACTION, smtpAction: SmtpAction<T>, state: TaskState }

export interface Channel {
  request<T> (action: Action<T>): kefir.Observable<T, Error>,
  serve (handle: <T>(action: Action<T>) => kefir.Observable<T, Error>): void
}

export class AccountService {
  accountManager: AccountManager

  constructor () {
    this.accountManager = new AccountManager()
  }

  serve (channel: Channel) {
    const that = this
    function handle<T> (action: Action<T>): kefir.Observable<T, Error> {
      return that.handle(action)
    }
    channel.serve(handle)
  }

  handle<T> (action: Action<T>): kefir.Observable<T> {
    switch (action.type) {
      case ACCOUNT_ACTION:
        return this.handleAccountAction(action.accountAction)
      case IMAP_ACTION:
        return this.handleImapAction(action.imapAction, action.state)
      case SMTP_ACTION:
        return this.handleSmtpAction(action.smtpAction, action.state)
      default:
        return kefir.constantError(
          new Error(`Unknown action type: ${action.type}`)
        )
    }
  }

  handleAccountAction<T> (action: AccountAction<T>): kefir.Observable<T> {
    return perform(action, this.accountManager)
  }

  handleImapAction<T> (
    action: ImapAction<T>,
    state: TaskState
  ): kefir.Observable<T> {
    const accountName = state.accountName
    if (!accountName) {
      return kefir.constantError(
        new Error('Task must select an account before running IMAP actions')
      )
    }
    return this.accountManager.withAccount(accountName, cm =>
      cm.request(action, state.connectionState)
    )
  }

  handleSmtpAction<T> (
    action: SmtpAction<T>,
    state: TaskState
  ): kefir.Observable<T> {
    const accountName = state.accountName
    if (!accountName) {
      return kefir.constantError(
        new Error('Task must select an account before running SMTP actions')
      )
    }
    return this.accountManager.withSmtpAccount(accountName, smtpTransport =>
      smtp.perform(action, smtpTransport)
    )
  }
}

function request<T> (
  action: Action<T>,
  channel: Channel
): kefir.Observable<T> {
  return channel.request(action)
}

export class AccountClient {
  channel: Channel

  constructor (channel: Channel) {
    this.channel = channel
  }

  runAccountAction<T> (action: AccountAction<T>): kefir.Observable<T, Error> {
    return request(
      {
        type: ACCOUNT_ACTION,
        accountAction: action
      },
      this.channel
    )
  }

  runImapAction<T> (action: ImapAction<T>, state: *): kefir.Observable<T> {
    return request(
      { type: IMAP_ACTION, imapAction: action, state },
      this.channel
    )
  }

  runSmtpAction<T> (action: SmtpAction<T>, state: *): kefir.Observable<T> {
    return request(
      { type: SMTP_ACTION, smtpAction: action, state },
      this.channel
    )
  }
}
