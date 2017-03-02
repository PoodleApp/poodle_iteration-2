/* @flow */

import * as G     from 'graphql'
import Connection from 'imap'
import schema     from './schema'
import Sync       from './sync'

import type { DocumentNode, ExecutionResult } from 'graphql'

export type IMAPConnection = Connection

export { default as schema } from './schema'

export function graphql(
  query:             string,
  connectionFactory: () => Promise<Connection>,
  variables?:        ?{[key: string]: mixed},
  operationName?:    ?string
): Promise<ExecutionResult> {
  const rootValue = null
  const context   = { connectionFactory }
  return G.graphql(schema, query, null, context, variables, operationName)
}

export function execute(
  query:             DocumentNode,
  connectionFactory: () => Promise<Connection>,
  sync:              Sync,
  variables?:        ?{[key: string]: mixed},
  operationName?:    ?string
): Promise<ExecutionResult> {
  const rootValue = sync
  const context   = { connectionFactory }
  return G.execute(schema, query, rootValue, context, variables, operationName)
}
