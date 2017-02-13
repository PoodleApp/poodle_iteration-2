/* @flow */

import * as oauth                     from 'graphql-imap/lib/oauth/google'
import keytar                         from 'keytar'
import * as auth                      from 'poodle-core/lib/actions/auth'
import * as chrome                    from 'poodle-core/lib/actions/chrome'
import { setCredentials }             from 'poodle-core/lib/transport'
import { takeLatest }                 from 'redux-saga'
import { call, cancelled, fork, put } from 'redux-saga/effects'

import type { Effect } from 'redux-saga'

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

function* loadAccount(): Generator<Effect, void, any> {
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
    return yield call(ipc.request, 'google-account')
  }
  catch (err) {
    yield put(chrome.showError(err))
  }
  finally {
    yield put(chrome.doneLoading('google-account'))
  }
}

function* initSession({ email, creds }: Object): Generator<Effect, void, any> {
  // TODO: clear Apollo cache when we get new credentials
  yield call(setCredentials, email, creds)
}

export default function* root(): Generator<Effect, void, any> {
  yield [
    fork(takeLatest, 'auth/setAccount',  initAccount),
    fork(takeLatest, 'auth/accessToken', initSession),
    fork(loadAccount),
  ]
}
