/* @flow */

import { graphql } from 'graphql'
import Connection  from 'imap'
import schema      from './schema'

import type { ExecutionResult } from 'graphql'

export type IMAPConnection = Connection

export { default as schema } from './schema'

export function executeQuery(
  query: string,
  connectionFactory: () => Promise<Connection>,
  variables?: ?{[key: string]: mixed},
  operationName?: ?string
): Promise<ExecutionResult> {
  const rootValue = null
  const context   = { connectionFactory }
  return graphql(schema, query, null, context, variables, operationName)
}
