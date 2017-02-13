/* @flow */

import * as graphqlimap from 'graphql-imap'
import * as google      from 'graphql-imap/lib/oauth/google'

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

const client_id     = '550977579314-ot07bt4ljs7pqenefen7c26nr80e492p.apps.googleusercontent.com'
const client_secret = 'ltQpgi6ce3VbWgxCXzCgKEEG'

// Ugly static variables
let credentials: ?google.OauthCredentials
let email: ?string
let connectionFactory: ?(() => Promise<IMAPConnection>)

export function setCredentials(email: string, creds: google.OauthCredentials) {
  credentials = creds
  email = email
  connectionFactory = null
}

async function getTokenGenerator(): Promise<google.XOAuth2Generator> {
  if (!credentials || !email) {
    return Promise.reject(new Error('cannot instantiate token generator without access token'))
  }
  return google.getTokenGenerator({
    email,
    credentials,
    client_id,
    client_secret,
  })
}

async function getConnectionFactory(): Promise<() => Promise<IMAPConnection>> {
  if (!connectionFactory) {
    const tokGen = await getTokenGenerator()
    connectionFactory = () => google.getConnection(tokGen)
  }
  return connectionFactory
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
