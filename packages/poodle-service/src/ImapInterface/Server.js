/* @flow */

import type EventEmitter from 'events'
import * as kefir from 'kefir'
import type PouchDB from 'pouchdb-node'
import { type ImapAccount } from '../models/ImapAccount'
import * as request from '../request'
import { type Action as RequestAction } from '../request/actions'
import * as tasks from '../tasks'
import { type AccountMetadata, type Email } from '../types'
import AccountManager from './AccountManager'
import * as actions from './actions'
import * as Channel from './channel'
import * as constants from './constants'

// TODO
type Result = any

export opaque type Server = {
  accountManager: AccountManager,
  channel: EventEmitter,
  db: PouchDB
}

export function NewServer (channel: EventEmitter, db: PouchDB): Server {
  const server = {
    accountManager: new AccountManager(),
    db,
    channel
  }
  Channel.serve(action => handle(action, server), channel)
  return server
}

export function handle<T> (action: actions.Action<T>, server: Server): kefir.Observable<T> {
  // Delgate to a private function to fix up the polymorphic return type
  return _handle(action, server)
}

function _handle (action: actions.Action<any>, server: Server): kefir.Observable<any> {
  switch (action.type) {
    case actions.ADD_ACCOUNT:
      return kefir.fromPromise(addAccount(action.account, server))
    case actions.DOWNLOAD_PART:
      return performTask(tasks.downloadPart(action), action.accountName, server)
    case actions.LIST_ACCOUNTS:
      return kefir.constant(server.accountManager.listAccounts())
    case actions.QUERY_CONVERSATIONS:
      return performTask(tasks.queryConversations(action), action.accountName, server)
    case actions.REMOVE_ACCOUNT:
      return kefir.fromPromise(removeAccount(action.accountName, server))
    default:
      return kefir.constantError(
        new Error(`Unknown action type: ${action.type}`)
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

function performTask<T> (task: tasks.Task<T>, accountName: string, server: Server): kefir.Observable<T> {
  return server.accountManager.withAccount(accountName, cm =>
    task.perform({
      performRequest: <T>(action: RequestAction<T>, state): kefir.Observable<T> => cm.request(action, state),
      db: server.db
    })
  )
}
