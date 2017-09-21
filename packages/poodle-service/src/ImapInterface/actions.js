/* @flow */

import type Conversation from 'arfe/lib/models/Conversation'
import * as imap from 'imap'
import { type ImapAccount } from '../models/ImapAccount'
import { type BoxSpecifier } from '../request'
import { type AccountMetadata, type Email, type ThreadId } from '../types'

export const ADD_ACCOUNT = 'imapInterface/addAccount'
export const DOWNLOAD_PART = 'imapInterface/downloadPart'
export const LIST_ACCOUNTS = 'imapInterface/listAccounts'
export const QUERY_CONVERSATIONS = 'imapInterface/queryConversations'
export const REMOVE_ACCOUNT = 'imapInterface/removeAccount'

export type Action<T> =
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

export function addAccount (account: ImapAccount): Action<void> {
  return { type: ADD_ACCOUNT, account }
}

// Resolves to database key for the downloaded part
export function downloadPart (opts: {
  accountName: string,
  messageId: string,
  part: imap.MessagePart,
  uid: imap.UID
}): Action<string> {
  return {
    type: DOWNLOAD_PART,
    accountName: opts.accountName,
    messageId: opts.messageId,
    part: opts.part,
    uid: opts.uid
  }
}

export function listAccounts (): Action<AccountMetadata[]> {
  return { type: LIST_ACCOUNTS }
}

export function queryConversations (opts: {
  accountName: string,
  limit?: number,
  query: string
}): Action<ThreadId> {
  return {
    type: QUERY_CONVERSATIONS,
    accountName: opts.accountName,
    limit: opts.limit,
    query: opts.query
  }
}

export function removeAccount (accountName: Email): Action<void> {
  return { type: REMOVE_ACCOUNT, accountName }
}
