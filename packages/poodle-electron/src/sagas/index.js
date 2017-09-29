/* @flow */

import keytar from 'keytar'
import * as auth from 'poodle-core/lib/actions/auth'
import authSaga, { type Dependencies } from 'poodle-core/lib/sagas/auth'
import queueSaga from 'poodle-core/lib/queue/saga'
import { type OauthCredentials } from 'poodle-service/lib/models/ImapAccount'
import { all, fork } from 'redux-saga/effects'
import imapClient from '../imapClient'
import * as oauth from '../oauth'

import type { Effect } from 'redux-saga'

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
  imapClient,
  getAccessToken: oauth.getAccessToken,
  loadAccessToken,
  storeAccessToken,
  loadAccount,
  saveAccount
}

export default function * root (): Generator<Effect, void, any> {
  yield all([fork(authSaga, authDeps), fork(queueSaga, { imapClient })])
}
