/* @flow */

import { type Email } from '../../types'
import { type Action as AccountAction } from './account'
import { type Action as ImapAction } from './imap'

export const ACCOUNT_ACTION = 'requests/accountAction'
export const IMAP_ACTION = 'requests/imapAction'

export type Action =
  | { type: typeof ACCOUNT_ACTION, action: AccountAction }
  | { type: typeof IMAP_ACTION, action: ImapAction, accountName: Email }

export function accountAction(action: AccountAction): Action {
  return { type: ACCOUNT_ACTION, action }
}

export function imapAction(action: ImapAction, accountName: Email): Action {
  return { type: IMAP_ACTION, action, accountName }
}
