/* @flow */

import * as kefir from 'kefir'
import * as m from 'mori'
import { type ImapAccount, getConnectionFactory } from '../models/ImapAccount'
import { type AccountMetadata, type Email } from '../types'
import * as imapActions from './actions/imap'
import ConnectionManager from './ConnectionManager'

export default class AccountManager {
  _accounts: m.Map<Email, ConnectionManager>
  _metadata: m.Map<Email, AccountMetadata>

  constructor () {
    this._accounts = m.hashMap()
    this._metadata = m.hashMap()
  }

  async add (account: ImapAccount): Promise<void> {
    const cf = await getConnectionFactory(account)
    const cm = new ConnectionManager(cf)
    this._accounts = m.assoc(this._accounts, account.email, cm)
    const capabilities = await cm
      .handle(imapActions.getCapabilities())
      .toPromise()
    const metadata = {
      email: account.email,
      capabilities
    }
    this._metadata = m.assoc(this._metadata, account.email, metadata)
  }

  async remove (accountName: Email): Promise<void> {
    this._accounts = m.dissoc(this._accounts, accountName)
    this._metadata = m.dissoc(this._metadata, accountName)
  }

  listAccounts(): AccountMetadata[] {
    return m.intoArray(m.vals(this._metadata))
  }

  withAccount<T> (
    accountName: Email,
    fn: (cf: ConnectionManager) => kefir.Observable<T>
  ): kefir.Observable<T> {
    const cf = m.get(this._accounts, accountName)
    if (!cf) {
      return kefir.constantError(
        new Error(`Not logged into account ${accountName}`)
      )
    }
    return fn(cf)
  }
}
