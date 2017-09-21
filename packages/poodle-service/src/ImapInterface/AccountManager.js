/* @flow */

import * as kefir from 'kefir'
import * as m from 'mori'
import { type ImapAccount, getConnectionFactory } from '../models/ImapAccount'
import * as actions from '../request/actions'
import * as state from '../request/state'
import { type AccountMetadata, type Email } from '../types'
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
      .request(actions.getCapabilities(), state.any)
      .toPromise()
    const metadata = {
      email: account.email,
      capabilities
    }
    this._metadata = m.assoc(this._metadata, account.email, metadata)
  }

  async remove (accountName: Email): Promise<void> {
    this.withAccount(accountName, cm => cm.request(actions.end(), state.any))
    this._accounts = m.dissoc(this._accounts, accountName)
    this._metadata = m.dissoc(this._metadata, accountName)
  }

  listAccounts (): AccountMetadata[] {
    return m.intoArray(m.vals(this._metadata))
  }

  withAccount<T> (
    accountName: Email,
    fn: (cm: ConnectionManager) => ?kefir.Observable<T>
  ): kefir.Observable<T> {
    const cm = m.get(this._accounts, accountName)
    if (!cm) {
      return kefir.constantError(
        new Error(`Not logged into account ${accountName}`)
      )
    }
    return fn(cm) || kefir.never()
  }
}
