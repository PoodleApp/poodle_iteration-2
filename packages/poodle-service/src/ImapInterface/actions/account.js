/* @flow */

import { type ImapAccount } from '../../models/ImapAccount'
import { type Email } from '../../types'

export const ADD = 'accountAction/add'
export const LIST = 'accountAction/list'
export const REMOVE = 'accountAction/remove'

export type Action =
  | { type: typeof ADD, account: ImapAccount }
  | { type: typeof LIST }
  | { type: typeof REMOVE, accountName: Email }

export function add (account: ImapAccount): Action {
  return { type: ADD, account }
}

export function list (): Action {
  return { type: LIST }
}

export function remove (accountName: Email): Action {
  return { type: REMOVE, accountName }
}
