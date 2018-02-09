/* @flow */

import * as kefir from 'kefir'
import { type ImapAccount } from '../models/ImapAccount'
import { type AccountMetadata, type Email } from '../types'
import { type Action as ImapAction } from '../request/actions'
import { type Action as SmtpAction } from '../request/actions'

export const ADD_ACCOUNT = 'imap/addAccount'
export const LIST_ACCOUNTS = 'imap/listAccounts'
export const REMOVE_ACCOUNT = 'imap/removeAccount'
export const WATCH_ACCOUNTS = 'imap/watchAccounts'

export type Action<T> =
  | { type: typeof ADD_ACCOUNT, account: ImapAccount }
  | { type: typeof LIST_ACCOUNTS }
  | { type: typeof REMOVE_ACCOUNT, accountName: Email }
  | { type: typeof WATCH_ACCOUNTS }

export function addAccount (account: ImapAccount): Action<void> {
  return { type: ADD_ACCOUNT, account }
}

export function listAccounts (): Action<AccountMetadata[]> {
  return { type: LIST_ACCOUNTS }
}

export function removeAccount (accountName: Email): Action<void> {
  return { type: REMOVE_ACCOUNT, accountName }
}

export function watchAccounts (): Action<kefir.Observable<AccountMetadata>> {
  return { type: WATCH_ACCOUNTS }
}
