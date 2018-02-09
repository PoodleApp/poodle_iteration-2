/* @flow */

import * as ImapAccount from 'poodle-service/lib/models/ImapAccount'
import * as tasks from 'poodle-service/lib/tasks'
import { all, call, cancelled, fork, put, takeLatest } from 'redux-saga/effects'
import * as auth from '../actions/auth'
import * as chrome from '../actions/chrome'
import { client_id, client_secret } from '../constants'

import type { Effect } from 'redux-saga'

export interface Dependencies {
  perform: tasks.Perform,

  // Should initiate OAuth flow to get a new access token if no valid token is
  // available in the keychain
  getAccessToken(email: string): Promise<ImapAccount.OauthCredentials>,

  // Should fetch access token from system keychain, if available
  loadAccessToken(
    account: auth.Account
  ): Promise<?ImapAccount.OauthCredentials>,

  // Should store access token in system keychain
  storeAccessToken(
    token: ImapAccount.OauthCredentials,
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

// TODO: Move check for saved account to main process
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

    // TODO: check account type
    yield deps.perform(
      tasks.addAccount,
      [{
        type: ImapAccount.GOOGLE,
        email: account.email,
        client_id,
        client_secret,
        credentials: token
      }]
    ).toPromise()

    // persist account info on successful login
    deps.saveAccount(account)
  }
}

function * fetchNewAccessToken (
  account: auth.Account,
  deps: Dependencies
): Generator<Effect, ?ImapAccount.OauthCredentials, any> {
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
  yield all([
    fork(takeLatest, 'auth/setAccount', initAccount, deps),
    fork(lookupAccount, deps)
  ])
}
