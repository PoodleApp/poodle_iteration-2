/* @flow */

import type EventEmitter from 'events'
import * as kefir from 'kefir'
import type PouchDB from 'pouchdb-node'
import { type ImapAccount } from '../models/ImapAccount'
import { type AccountMetadata, type Email } from '../types'
import AccountManager from './AccountManager'
import ConnectionManager from './ConnectionManager'
import * as actions from './actions'
import * as accountActions from './actions/account'
import * as imapActions from './actions/imap'
import * as Channel from './channel'
import * as constants from './constants'

// TODO
type Result = any

export opaque type Server = {
  accountManager: AccountManager,
  channel: EventEmitter
}

export function NewServer (channel: EventEmitter, db: PouchDB): Server {
  const server = {
    accountManager: new AccountManager(db),
    channel
  }
  Channel.serve(action => handle(action, server), channel)
  return server
}

export function handle (action: actions.Action, server: Server): kefir.Observable<Result> {
  switch (action.type) {
    case actions.ACCOUNT_ACTION:
      return handleAccountAction(action.action, server)
    case actions.IMAP_ACTION:
      return handleImapAction(action.action, action.accountName, server)
    default:
      return kefir.constantError(
        new Error(`Unknown action type: ${action.type}`)
      )
  }
}

function handleAccountAction (
    action: accountActions.Action,
  server: Server
  ): kefir.Observable<Result> {
    switch (action.type) {
      case accountActions.ADD:
        return kefir.fromPromise(addAccount(action.account, server))
      case accountActions.LIST:
        return kefir.constant(server.accountManager.listAccounts())
      case accountActions.REMOVE:
        return kefir.fromPromise(removeAccount(action.accountName, server))
      default:
        return kefir.constantError(
          new Error(`Unknown account action type: ${action.type}`)
        )
    }
  }

async function addAccount (account: ImapAccount, server: Server): Promise<void> {
  await server.accountManager.add(account)
  broadcastAccountsList(server)
}

async function removeAccount (accountName: Email, server: Server): Promise<void> {
  await server.accountManager.remove(accountName)
  broadcastAccountsList(server)
}

async function broadcastAccountsList (server: Server) {
  const accounts = server.accountManager.listAccounts()
  server.channel.emit(constants.ACCOUNT_LIST, accounts)
}

function handleImapAction (
  action: imapActions.Action,
  accountName: Email,
  server: Server
): kefir.Observable<Result> {
  return server.accountManager.withAccount(accountName, cm =>
    cm.handle(action)
  )
}
