/* @flow */

import * as actions from '../accounts/actions'
import { type ImapAccount } from '../models/ImapAccount'
import { type Email } from '../types'
import Task from './Task'

export function addAccount (account: ImapAccount): Task<void> {
  return accountTask(actions.addAccount(account))
}

export function selectAccount (accountName: Email): Task<void> {
  return Task.modifyState(state => ({
    ...state,
    accountName
  }))
}

function accountTask<T> (action: actions.Action<T>): Task<T> {
  return new Task((context, state) =>
    context.runAccountAction(action).map(value => ({ value, state }))
  )
}
