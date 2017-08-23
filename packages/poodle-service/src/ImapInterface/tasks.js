/* @flow */

import * as imap from 'imap'

export const FETCH_MESSAGES: 'imapTask/fetchMessages' = 'imapTask/fetchMessages'
export const FETCH_PARTS: 'imapTask/fetchParts' = 'imapTask/fetchParts'
export const SEARCH: 'imapTask/search' = 'imapTask/search'

export type Task =
  | {
      type: typeof FETCH_MESSAGES,
      box: string,
      capabilities: string[],
      source: imap.MessageSource
    }
  | {
      type: typeof FETCH_PARTS,
      box: string,
      capabilities: string[],
      source: imap.MessageSource
    }
  | {
      type: typeof SEARCH,
      box: string,
      capabilities: string[], // capabilities required to perform a task
      criteria: mixed[]
    }

export function fetchMessages(box: string, source: imap.MessageSource): Task {
  return { type: FETCH_MESSAGES, box, capabilities: [], source }
}

export function fetchParts (box: string, source: imap.MessageSource): Task {
  return { type: FETCH_PARTS, box, capabilities: [], source }
}

export function search (
  box: string,
  criteria: mixed[],
  capabilities: string[] = []
): Task {
  return { type: SEARCH, box, criteria, capabilities }
}
