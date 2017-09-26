/* @flow */

import * as google from './google'
import { type ConnectionFactory, type ImapAccount } from './types'
import * as types from './types'

export * from './types'

export async function getConnectionFactory(account: ImapAccount): Promise<ConnectionFactory> {
  switch (account.type) {
    case types.GOOGLE:
      return google.getConnectionFactory(account)
    default:
      throw new Error(`Unknown account type: ${account.type}`)
  }
}
