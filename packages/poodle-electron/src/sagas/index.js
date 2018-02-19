/* @flow */

import keytar from 'keytar'
import open from 'open'
import * as auth from 'poodle-core/lib/actions/auth'
import coreSagas, { type Dependencies } from 'poodle-core/lib/sagas'
import { type OauthCredentials } from 'poodle-service/lib/models/ImapAccount'
import { type Effect, all, fork } from 'redux-saga/effects'
import { _perform as perform } from '../imapClient'
import * as oauth from '../oauth'

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

// Attempt to load access token from OS keychain
async function loadAccessToken (
  account: auth.Account
): Promise<?OauthCredentials> {
  let creds = keytar.getPassword('Poodle', account.email)
  creds = creds && JSON.parse(creds)
  if (creds && creds.refresh_token) {
    return creds
  }
}

async function storeAccessToken (
  token: OauthCredentials,
  account: auth.Account
) {
  keytar.replacePassword('Poodle', account.email, JSON.stringify(token))
}

async function loadAccount (): Promise<?auth.Account> {
  const data = localStorage.getItem('account')
  if (data) {
    return JSON.parse(data)
  }
}

async function saveAccount (account: auth.Account) {
  localStorage.setItem('account', JSON.stringify(account))
}

const authDeps: Dependencies = {
  perform,
  getAccessToken: oauth.getAccessToken,
  loadAccessToken,
  storeAccessToken,
  loadAccount,
  saveAccount,
  openExternal: open
}

export default function * root (): Generator<Effect, void, any> {
  yield fork(coreSagas, authDeps)
}
