/* @flow */

import type EventEmitter from 'events'
import * as kefir from 'kefir'
import type PouchDB from 'pouchdb-node'
import * as accounts from '../accounts'
import { type Action as AccountAction } from '../accounts/actions'
import { type ImapAccount } from '../models/ImapAccount'
import * as request from '../request'
import { type Action as ImapAction } from '../request/actions'
import * as tasks from '../tasks'
import { type AccountMetadata, type Email } from '../types'

// TODO: in the future a `Server` will receive and respond to requests via IPC

export opaque type Server = {
  accountManager: accounts.AccountManager,
  activeAccounts: kefir.Observable<AccountMetadata[]>,
  db: PouchDB,
  onAccountsChange: (as: AccountMetadata[]) => any
}

export function NewServer (db: PouchDB): Server {
  let emitter
  const onAccountsChange = (as: AccountMetadata[]) => {
    if (emitter) {
      emitter.value(as)
    }
  }
  const activeAccounts = kefir.stream(e => {
    emitter = e
  })

  return {
    accountManager: new accounts.AccountManager(),
    activeAccounts,
    db,
    onAccountsChange
  }
}

export function activeAccounts (server: Server) {
  return server.activeAccounts
}

export function perform<T, Args: *> (
  server: Server,
  taskFn: (...args: Args) => tasks.Task<T>,
  args: Args,
  initialState?: ?tasks.State
): kefir.Observable<T> {
  return taskFn(...args).perform({
    runAccountAction: runAccountAction(server.accountManager),
    runImapAction: runImapAction(server.accountManager),
    db: server.db
  })
}

function runAccountAction (
  accountManager: accounts.AccountManager
): (action: AccountAction<any>) => kefir.Observable<any> {
  return action => accounts.perform(action, accountManager)
}

function runImapAction (
  accountManager: accounts.AccountManager
): (action: ImapAction<any>, state: tasks.State) => kefir.Observable<any> {
  return (action, state) => {
    const accountName = state.accountName
    if (!accountName) {
      return kefir.constantError(
        new Error('Task must select an account before running IMAP actions')
      )
    }
    return accountManager.withAccount(accountName, cm =>
      cm.request(action, state.connectionState)
    )
  }
}
