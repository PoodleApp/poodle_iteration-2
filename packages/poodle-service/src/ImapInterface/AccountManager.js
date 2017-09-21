/* @flow */

import type Connection from 'imap'
import * as kefir from 'kefir'
import * as m from 'mori'
import { type ImapAccount, getConnectionFactory } from '../models/ImapAccount'
import { type AccountMetadata, type Email } from '../types'

export default class AccountManager {
  _accounts: m.Map<Email, Connection>
  _metadata: m.Map<Email, AccountMetadata>

  constructor () {
    this._accounts = m.hashMap()
    this._metadata = m.hashMap()
  }

  async add (account: ImapAccount): Promise<void> {
    const cf = await getConnectionFactory(account)
    const connection: Connection = await cf()
    this._accounts = m.assoc(this._accounts, account.email, connection)
    const capabilities: string[] = (connection: any)._caps || []
    const metadata = {
      email: account.email,
      capabilities
    }
    this._metadata = m.assoc(this._metadata, account.email, metadata)
  }

  async remove (accountName: Email): Promise<void> {
    this.withAccount(accountName, connection => connection.end())
    this._accounts = m.dissoc(this._accounts, accountName)
    this._metadata = m.dissoc(this._metadata, accountName)
  }

  listAccounts (): AccountMetadata[] {
    return m.intoArray(m.vals(this._metadata))
  }

  withAccount<T> (
    accountName: Email,
    fn: (c: Connection) => ?kefir.Observable<T>
  ): kefir.Observable<T> {
    const connection = m.get(this._accounts, accountName)
    if (!connection) {
      return kefir.constantError(
        new Error(`Not logged into account ${accountName}`)
      )
    }
    return fn(connection) || kefir.never()
  }
}
