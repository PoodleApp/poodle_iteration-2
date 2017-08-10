/* @flow */

import keytar from 'keytar'
import * as auth from 'poodle-core/lib/actions/auth'
import authSaga from 'poodle-core/lib/sagas/auth'
import queueSaga from 'poodle-core/lib/queue/saga'
import { fork } from 'redux-saga/effects'
import * as oauth from '../oauth'

import type { Effect } from 'redux-saga'

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

// Attempt to load access token from OS keychain
async function loadAccessToken (
  account: auth.Account
): Promise<?oauth.OauthCredentials> {
  let creds = keytar.getPassword('Poodle', account.email)
  creds = creds && JSON.parse(creds)
  if (creds && creds.refresh_token) {
    return creds
  }
}

async function storeAccessToken (
  token: oauth.OauthCredentials,
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

const authDeps = {
  getAccessToken: oauth.getAccessToken,
  loadAccessToken,
  storeAccessToken,
  loadAccount,
  saveAccount
}

export default function * root (): Generator<Effect, void, any> {
  yield [
    fork(authSaga, authDeps),
    fork(queueSaga)
  ]
}
