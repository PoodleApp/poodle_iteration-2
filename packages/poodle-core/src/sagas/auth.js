/* @flow */

import * as oauth from 'poodle-service/lib/oauth/google'
import { takeLatest } from 'redux-saga'
import { call, cancelled, fork, put } from 'redux-saga/effects'
import * as auth from '../actions/auth'
import * as chrome from '../actions/chrome'

import type { Effect } from 'redux-saga'

export interface Dependencies {
  // Should initiate OAuth flow to get a new access token if no valid token is
  // available in the keychain
  getAccessToken(email: string): Promise<oauth.OauthCredentials>,

  // Should fetch access token from system keychain, if available
  loadAccessToken(account: auth.Account): Promise<?oauth.OauthCredentials>,

  // Should store access token in system keychain
  storeAccessToken(
    token: oauth.OauthCredentials,
    account: auth.Account
  ): Promise<void>,

  loadAccount(): Promise<?auth.Account>,

  saveAccount(account: auth.Account): Promise<void>
}

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

function * lookupAccount (deps: Dependencies): Generator<Effect, void, any> {
  try {
    const account = yield call(deps.loadAccount)
    if (account) {
      yield put(auth.setAccount(account))
    }
  } catch (err) {
    yield put(chrome.showError(err))
  }
}

function * initAccount (
  deps: Dependencies,
  { account }: Object
): Generator<Effect, void, any> {
  let token = yield call(deps.loadAccessToken, account)
  if (!token) {
    token = yield * fetchNewAccessToken(account, deps)
  }
  if (token) {
    yield call(deps.storeAccessToken, token, account)
    // TODO: yield put(auth.accessToken(account.email, token))

    // persist account info on successful login
    deps.saveAccount(account)
  }
}

function * fetchNewAccessToken (
  account: auth.Account,
  deps: Dependencies
): Generator<Effect, ?oauth.OauthCredentials, any> {
  try {
    yield put(
      chrome.indicateLoading('authentication-flow', 'Authorizing with Google')
    )
    return yield call(deps.getAccessToken, account)
  } catch (err) {
    yield put(chrome.showError(err))
  } finally {
    yield put(chrome.doneLoading('authentication-flow'))
  }
}

export default function * root (
  deps: Dependencies
): Generator<Effect, void, any> {
  yield [
    fork(takeLatest, 'auth/setAccount', initAccount, deps),
    fork(lookupAccount, deps)
  ]
}
