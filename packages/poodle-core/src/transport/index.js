/* @flow */

import * as graphqlimap from 'graphql-imap'

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
  connectionFactory: () => Promise<IMAPConnection>

  constructor(connectionFactory: () => Promise<IMAPConnection>) {
    this.connectionFactory = connectionFactory
  }

  query({ query, variables, operationName }: Request): Promise<ExecutionResult> {
    if (!query) {
      return Promise.reject(new Error("`query` must be defined"))
    }
    return graphqlimap.execute(query, this.connectionFactory, variables, operationName)
  }
}
