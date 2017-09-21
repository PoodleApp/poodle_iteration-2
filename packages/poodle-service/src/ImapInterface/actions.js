/* @flow */

import * as imap from 'imap'
import { type ImapAccount } from '../models/ImapAccount'
import { type BoxSpecifier } from '../request'
import { type Email } from '../types'

export const ADD_ACCOUNT = 'imapInterface/addAccount'
export const DOWNLOAD_PART = 'imapInterface/downloadPart'
export const LIST_ACCOUNTS = 'imapInterface/listAccounts'
export const QUERY_CONVERSATIONS = 'imapInterface/queryConversations'
export const REMOVE_ACCOUNT = 'imapInterface/removeAccount'

export type Action =
  | { type: typeof ADD_ACCOUNT, account: ImapAccount }
  | {
      type: typeof DOWNLOAD_PART,
      accountName: string,
      box: BoxSpecifier,
      messageId: string,
      part: imap.MessagePart,
      uid: imap.UID
    }
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

export function downloadPart (opts: {
  accountName: string,
  messageId: string,
  part: imap.MessagePart,
  uid: imap.UID
}): Action {
  return {
    type: DOWNLOAD_PART,
    accountName: opts.accountName,
    messageId: opts.messageId,
    part: opts.part,
    uid: opts.uid
  }
}

export function listAccounts (): Action {
  return { type: LIST_ACCOUNTS }
}

export function queryConversations (opts: {
  accountName: string,
  limit?: number,
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
