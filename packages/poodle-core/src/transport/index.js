/* @flow */

import * as graphqlimap from 'graphql-imap'

// TODO
import * as google     from 'graphql-imap/lib/oauth/google'
import * as googletest from './temp_hack'

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

export class GraphQLImapInterface {
  connectionFactory: ?(() => Promise<IMAPConnection>)

  constructor() {
    googletest.getTokenGenerator()
      .then(tokGen => {
        const connectionFactory = () => google.getConnection(tokGen)
        this.connectionFactory = connectionFactory
      })
  }

  query({ query, variables, operationName }: Request): Promise<ExecutionResult> {
    if (!query) {
      return Promise.reject(new Error("`query` must be defined"))
    }
    if (!this.connectionFactory) {
      return Promise.reject(new Error("IMAP connection is not ready"))
    }
    return graphqlimap.execute(query, this.connectionFactory, variables, operationName)
  }
}
