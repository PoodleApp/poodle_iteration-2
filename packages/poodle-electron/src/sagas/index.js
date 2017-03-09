/* @flow */

import keytar                         from 'keytar'
import * as auth                      from 'poodle-core/lib/actions/auth'
import * as chrome                    from 'poodle-core/lib/actions/chrome'
import { setCredentials }             from 'poodle-core/lib/transport'
import { takeLatest }                 from 'redux-saga'
import { call, cancelled, fork, put } from 'redux-saga/effects'
import * as oauth                     from '../oauth'

import type { Effect } from 'redux-saga'

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

function* lookupAccount(): Generator<Effect, void, any> {
  try {
    const account = yield call(loadAccount)
    yield put(auth.setAccount(account))
  }
  catch (err) {
    yield put(chrome.showError(err))
  }
}

function loadAccount(): ?auth.Account {
  const data = localStorage.getItem('account')
  if (data) { return JSON.parse(data) }
}

function saveAccount(account: auth.Account) {
  localStorage.setItem('account', JSON.stringify(account))
}

function* initAccount({ account }: Object): Generator<Effect, void, any> {
  let token = yield call(loadAccessToken, account)
  if (!token) {
    token = yield* fetchNewAccessToken(account)
  }
  if (token) {
    // TODO: clear Apollo cache when we get new credentials
    // TODO: construct apollo transport with a store subscriber instead of
    // pushing credentials here
    yield call(setCredentials, account.email, token)
    yield put(auth.accessToken(account.email, token))

    // persist account info on successful login
    saveAccount(account)
  }
}

// Attempt to load access token from OS keychain
function loadAccessToken(account: auth.Account): ?oauth.OauthCredentials {
  let creds = keytar.getPassword('Poodle', account.email)
  creds = creds && JSON.parse(creds)
  if (creds && creds.refresh_token) {
    return creds
  }
}

function* fetchNewAccessToken(account: auth.Account): Generator<Effect, ?oauth.OauthCredentials, any> {
  try {
    yield put(chrome.indicateLoading('google-account', 'Authorizing with Google'))
    return yield call(oauth.getAccessToken, account)
  }
  catch (err) {
    yield put(chrome.showError(err))
  }
  finally {
    yield put(chrome.doneLoading('google-account'))
  }
}

export default function* root(): Generator<Effect, void, any> {
  yield [
    fork(takeLatest, 'auth/setAccount',  initAccount),
    fork(lookupAccount),
  ]
}
