/* @flow */

import * as poodleservice           from 'poodle-service'
import * as google                  from 'poodle-service/lib/oauth/google'
import Sync                         from 'poodle-service/lib/sync'
import { client_id, client_secret } from '../constants'

import type { DocumentNode, ExecutionResult } from 'graphql'
import type { IMAPConnection }                from 'poodle-service'

// copied from apollo-client/src/transport/NetworkInterface.ts
type Request = {
  debugName?: string,
  query?: DocumentNode,
  variables?: Object,
  operationName?: string,
  [additionalKey: string]: any,
}

// Ugly static variables
let _credentials: ?google.OauthCredentials
let _email: ?string
let _connectionFactory: ?(() => Promise<IMAPConnection>)
let _sync: ?Sync

export function setCredentials(email: string, creds: google.OauthCredentials) {
  _credentials = creds
  _email = email
  _connectionFactory = null
  if (_sync) { _sync.terminate() }
  _sync = null
}

async function getTokenGenerator(): Promise<google.XOAuth2Generator> {
  if (!_credentials || !_email) {
    return Promise.reject(new Error('cannot instantiate token generator without access token'))
  }
  return google.getTokenGenerator({
    email: _email,
    credentials: _credentials,
    client_id,
    client_secret,
  })
}

async function getConnectionFactory(): Promise<() => Promise<IMAPConnection>> {
  if (!_connectionFactory) {
    const tokGen = await getTokenGenerator()
    _connectionFactory = () => google.getConnection(tokGen)
  }
  return _connectionFactory
}

async function getSync(): Promise<Sync> {
  if (!_sync) {
    _sync = new Sync({
      boxes:             ['\\All'],
      connectionFactory: await getConnectionFactory(),
      dbname:            `poodle-${_email || ''}`,
    })
  }
  return _sync
}

export class PoodleServiceInterface {

  async query({ query, variables, operationName }: Request): Promise<ExecutionResult> {
    if (!query) {
      return Promise.reject(new Error("`query` must be defined"))
    }
    return poodleservice.execute(
      query,
      await getConnectionFactory(),
      await getSync(),
      variables,
      operationName
    )
  }

}
