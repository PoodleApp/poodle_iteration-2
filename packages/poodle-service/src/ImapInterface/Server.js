/* @flow */

import * as kefir from 'kefir'
import { type ImapAccount } from '../models/ImapAccount'
import { type AccountMetadata, type Email } from '../types'
import AccountManager from './AccountManager'
import ConnectionManager from './ConnectionManager'
import * as actions from './actions'
import * as accountActions from './actions/account'
import * as imapActions from './actions/imap'
import * as Channel from './channel'
import * as constants from './constants'

// TODO
type Result = any

export default class Server {
  _accountManager: AccountManager
  _channel: ?EventEmitter

  constructor () {
    this._accountManager = new AccountManager()
  }

  serve (channel: EventEmitter) {
    if (this._channel) {
      throw new Error('Already serving')
    }
    this._channel = channel
    Channel.serve(this.handle.bind(this), channel)
  }

  handle (action: actions.Action): kefir.Observable<Result> {
    switch (action.type) {
      case actions.ACCOUNT_ACTION:
        return this._handleAccountAction(action.action)
      case actions.IMAP_ACTION:
        return this._handleImapAction(action.action, action.accountName)
      default:
        return kefir.constantError(
          new Error(`Unknown action type: ${action.type}`)
        )
    }
  }

  _handleAccountAction (
    action: accountActions.Action
  ): kefir.Observable<Result> {
    switch (action.type) {
      case accountActions.ADD:
        return kefir.fromPromise(this._addAccount(action.account))
      case accountActions.LIST:
        return kefir.constant(this._accountManager.listAccounts())
      case accountActions.REMOVE:
        return kefir.fromPromise(this._removeAccount(action.accountName))
      default:
        return kefir.constantError(
          new Error(`Unknown account action type: ${action.type}`)
        )
    }
  }

  async _addAccount (account: ImapAccount): Promise<void> {
    await this._accountManager.add(account)
    this._broadcastAccountsList()
  }

  async _removeAccount (accountName: Email): Promise<void> {
    await this._accountManager.remove(accountName)
    this._broadcastAccountsList()
  }

  async _broadcastAccountsList () {
    const accounts = this._accountManager.listAccounts()
    if (this._channel) {
      this._channel.emit(constants.ACCOUNT_LIST, accounts)
    }
  }

  _handleImapAction (
    action: imapActions.Action,
    accountName: Email
  ): kefir.Observable<Result> {
    return this._accountManager.withAccount(accountName, cm =>
      cm.handle(action)
    )
  }
}
