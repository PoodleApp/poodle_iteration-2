/* @flow */

import * as graphqlimap             from 'graphql-imap'
import * as google                  from 'graphql-imap/lib/oauth/google'
import { client_id, client_secret } from '../constants'

import type { DocumentNode, ExecutionResult } from 'graphql'
import type { IMAPConnection }                from 'graphql-imap'

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

export function setCredentials(email: string, creds: google.OauthCredentials) {
  _credentials = creds
  _email = email
  _connectionFactory = null
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

export class GraphQLImapInterface {

  async query({ query, variables, operationName }: Request): Promise<ExecutionResult> {
    const cf = await getConnectionFactory()
    if (!query) {
      return Promise.reject(new Error("`query` must be defined"))
    }
    return graphqlimap.execute(query, cf, variables, operationName)
  }

}
