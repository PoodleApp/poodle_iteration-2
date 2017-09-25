/*
 * Perform actions defined in './actions'
 *
 * @flow
 */

import * as kefir from 'kefir'
import { type ImapAccount } from '../models/ImapAccount'
import { type Email } from '../types'
import type AccountManager from './AccountManager'
import * as actions from './actions'

export default function perform<T> (
  action: actions.Action<T>,
  accountManager: AccountManager
): kefir.Observable<T> {
  // Delegate to private function to fix up polymorphic type
  return _perform(action, accountManager)
}

function _perform (
  action: actions.Action<any>,
  accountManager: AccountManager
): kefir.Observable<any> {
  switch (action.type) {
    case actions.ADD_ACCOUNT:
      return kefir.fromPromise(addAccount(action.account, accountManager))
    case actions.LIST_ACCOUNTS:
      return kefir.constant(accountManager.listAccounts())
    case actions.REMOVE_ACCOUNT:
      return kefir.fromPromise(removeAccount(action.accountName, accountManager))
    default:
      return kefir.constantError(
        new Error(`Unknown action type: ${action.type}`)
      )
  }
}

async function addAccount (
  account: ImapAccount,
  accountManager: AccountManager
): Promise<void> {
  await accountManager.add(account)
}

async function removeAccount (
  accountName: Email,
  accountManager: AccountManager
): Promise<void> {
  await accountManager.remove(accountName)
}
