/* @flow */

import { type URI } from 'arfe/lib/models/uri'
import * as imap from 'imap'

// export const FETCH = 'imapAction/fetch'
export const FETCH_PART = 'imapAction/fetchPart'
// export const FETCH_THREADS = 'imapAction/fetchThreads'
export const GET_CAPABILITIES = 'imapAction/getCapabilities'
// export const SEARCH = 'imapAction/search'
export const QUERY_CONVERSATIONS = 'imapAction/queryConversations'

export type Action =
  // | {
  //     type: typeof FETCH_THREADS,
  //     box: string,
  //     source: imap.MessageSource
  //   }
  | {
      type: typeof FETCH_PART,
      box: string,
      messageId: string,
      part: imap.MessagePart,
      uid: imap.UID
    }
  | {
      type: typeof GET_CAPABILITIES
    }
  // | {
  //     type: typeof SEARCH,
  //     box: string,
  //     criteria: mixed[]
  //   }
  | {
      type: typeof QUERY_CONVERSATIONS,
      box: ?string,
      query: string
    }

export function fetchPart (opts: {
  box: string,
  messageId: string,
  part: imap.MessagePart,
  uid: imap.UID
}): Action {
  const box: string = opts.box
  const messageId: string = opts.messageId
  const part: imap.MessagePart = opts.part
  const uid: imap.UID = opts.uid
  return { type: FETCH_PART, box, messageId, part, uid }
}

// export function fetchThreads (opts: {
//   box: string,
//   source: imap.MessageSource
// }): Action {
//   const box: string = opts.box
//   const source: imap.MessageSource = opts.source
//   return { type: FETCH_THREADS, box, source }
// }

export function getCapabilities (): Action {
  return { type: GET_CAPABILITIES }
}

// export function search ({
//   box,
//   criteria
// }: {
//   box: string,
//   criteria: mixed[]
// }): Action {
//   return { type: SEARCH, box, criteria }
// }

export function queryConversations (opts: {
  box?: string,
  query: string
}): Action {
  return {
    type: QUERY_CONVERSATIONS,
    box: opts.box,
    query: opts.query
  }
}
