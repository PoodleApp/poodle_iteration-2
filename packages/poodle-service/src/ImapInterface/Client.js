/*
 * Functions to send requests to an ImapInterface over some channel.
 *
 * @flow
 */

import * as kefir from 'kefir'
import * as tasks from '../tasks'
import { type AccountMetadata, type Email } from '../types'
import * as server from './Server'

// TODO: in the future the `Client` will relay task requests to a `Server`
// instance via IPC. For the time being the client just runs tasks directly.

export opaque type Client = {
  server: server.Server
}

export function NewClient (server: server.Server): Client {
  return {
    server
  }
}

export function accounts (client: Client): kefir.Observable<AccountMetadata[]> {
  return server.activeAccounts(client.server)
}

export function perform<A, Args: *> (
  client: Client,
  taskFn: (...args: Args) => tasks.Task<A>,
  args: Args,
  initialState?: ?tasks.State
): kefir.Observable<A> {
  return server.perform(client.server, taskFn, args, initialState)
}
