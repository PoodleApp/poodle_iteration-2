/* @flow */

import { type ImapAccount } from '../models/ImapAccount'
import { type AccountMetadata, type Email } from '../types'

export const ADD_ACCOUNT = 'imap/addAccount'
export const LIST_ACCOUNTS = 'imap/listAccounts'
export const REMOVE_ACCOUNT = 'imap/removeAccount'

export type Action<T> =
  | { type: typeof ADD_ACCOUNT, account: ImapAccount }
  | { type: typeof LIST_ACCOUNTS }
  | { type: typeof REMOVE_ACCOUNT, accountName: Email }

export function addAccount (account: ImapAccount): Action<void> {
  return { type: ADD_ACCOUNT, account }
}

export function listAccounts (): Action<AccountMetadata[]> {
  return { type: LIST_ACCOUNTS }
}

export function removeAccount (accountName: Email): Action<void> {
  return { type: REMOVE_ACCOUNT, accountName }
}
