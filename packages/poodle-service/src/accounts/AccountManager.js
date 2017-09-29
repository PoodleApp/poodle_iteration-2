/* @flow */

import * as kefir from 'kefir'
import * as m from 'mori'
import nodemailer from 'nodemailer'
import {
  type ImapAccount,
  getConnectionFactory,
  getSmtpConfig
} from '../models/ImapAccount'
import * as actions from '../request/actions'
import * as state from '../request/state'
import * as smtp from '../smtp'
import { type AccountMetadata, type Email } from '../types'
import ConnectionManager from './ConnectionManager'

export default class AccountManager {
  _accounts: m.Map<Email, ConnectionManager>
  _metadata: m.Map<Email, AccountMetadata>
  _smtpAccounts: m.Map<Email, smtp.Transporter>

  constructor () {
    this._accounts = m.hashMap()
    this._metadata = m.hashMap()
    this._smtpAccounts = m.hashMap()
  }

  async add (account: ImapAccount): Promise<void> {
    const cf = await getConnectionFactory(account)
    const smtpConfig = await getSmtpConfig(account)
    const cm = new ConnectionManager(cf)
    this._accounts = m.assoc(this._accounts, account.email, cm)
    this._smtpAccounts = m.assoc(
      this._smtpAccounts,
      account.email,
      nodemailer.createTransport(smtpConfig)
    )
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

  withSmtpAccount<T> (
    accountName: Email,
    fn: (smtpTransport: smtp.Transporter) => ?kefir.Observable<T>
  ): kefir.Observable<T> {
    const smtpTransport = m.get(this._smtpAccounts, accountName)
    if (!smtpTransport) {
      return kefir.constantError(
        new Error(`Not logged into account ${accountName}`)
      )
    }
    return fn(smtpTransport) || kefir.never()
  }
}
