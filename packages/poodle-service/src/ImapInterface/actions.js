/* @flow */

import { type ImapAccount } from '../models/ImapAccount'
import { type Email } from '../types'

export const ADD_ACCOUNT = 'imapInterface/addAccount'
export const LIST_ACCOUNTS = 'imapInterface/listAccounts'
export const QUERY_CONVERSATIONS = 'imapInterface/queryConversations'
export const REMOVE_ACCOUNT = 'imapInterface/removeAccount'

export type Action =
  | { type: typeof ADD_ACCOUNT, account: ImapAccount }
  | { type: typeof LIST_ACCOUNTS }
  | {
      type: typeof QUERY_CONVERSATIONS,
      accountName: string,
      limit: ?number,
      query: string
    }
  | { type: typeof REMOVE_ACCOUNT, accountName: Email }

export function addAccount (account: ImapAccount): Action {
  return { type: ADD_ACCOUNT, account }
}

export function listAccounts (): Action {
  return { type: LIST_ACCOUNTS }
}

export function queryConversations (opts: {
  accountName: string,
  limit: ?number,
  query: string
}): Action {
  return {
    type: QUERY_CONVERSATIONS,
    accountName: opts.accountName,
    limit: opts.limit,
    query: opts.query
  }
}

export function removeAccount (accountName: Email): Action {
  return { type: REMOVE_ACCOUNT, accountName }
}
