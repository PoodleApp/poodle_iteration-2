/* @flow */

import type EventEmitter from 'events'
import * as kefir from 'kefir'
import * as accounts from '../accounts'
import { type Action as AccountAction } from '../accounts/actions'
import * as cache from '../cache'
import { type ImapAccount } from '../models/ImapAccount'
import * as request from '../request'
import { type Action as ImapAction } from '../request/actions'
import * as smtp from '../smtp'
import * as tasks from '../tasks'
import { type AccountMetadata, type Email } from '../types'

// TODO: in the future a `Server` will receive and respond to requests via IPC

export opaque type Server = {
  accountManager: accounts.AccountManager,
  activeAccounts: kefir.Observable<AccountMetadata[]>,
  db: Promise<cache.DB>,
  onAccountsChange: (as: AccountMetadata[]) => any
}

export function NewServer (db?: cache.DB): Server {
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
    db: db ? Promise.resolve(db) : cache.initialize(),
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
  return kefir.fromPromise(server.db).flatMap(db =>
    taskFn(...args).perform({
      runAccountAction: runAccountAction(server),
      runImapAction: runImapAction(server.accountManager),
      runSmtpAction: runSmtpAction(server.accountManager),
      db
    }, initialState)
  )
}

function runAccountAction (
  { accountManager, onAccountsChange }: Server
): (action: AccountAction<any>) => kefir.Observable<any> {
  return action => {
    const result = accounts.perform(action, accountManager)
    result.onEnd(() => onAccountsChange(accountManager.listAccounts()))
    return result
  }
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

function runSmtpAction (
  accountManager: accounts.AccountManager
): (action: smtp.Action<any>, state: tasks.State) => kefir.Observable<any> {
  return (action, state) => {
    const accountName = state.accountName
    if (!accountName) {
      return kefir.constantError(
        new Error('Task must select an account before running SMTP actions')
      )
    }
    return accountManager.withSmtpAccount(accountName, smtpTransport =>
      smtp.perform(action, smtpTransport)
    )
  }
}
