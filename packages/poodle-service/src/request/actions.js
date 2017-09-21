/* @flow */

import * as imap from 'imap'

export const FETCH = 'imapRequest/fetch'
export const GET_BOX = 'imapRequest/getBox'
export const GET_CAPABILITIES = 'imapRequest/getCapabilities'
export const SEARCH = 'imapRequest/search'

export type Action<T> =
  | {
      type: typeof FETCH,
      source: imap.MessageSource,
      options: imap.FetchOptions
    }
  | { type: typeof GET_BOX }
  | { type: typeof GET_CAPABILITIES }
  | { type: typeof SEARCH, criteria: any[] }

export function fetch (
  source: imap.MessageSource,
  options: imap.FetchOptions = {}
): Action<imap.ImapMessage> {
  return {
    type: FETCH,
    source,
    options
  }
}

export function getBox (): Action<?imap.Box> {
  return { type: GET_BOX }
}

export function getCapabilities (): Action<string[]> {
  return { type: GET_CAPABILITIES }
}

export function search (criteria: any[]): Action<imap.UID[]> {
  return { type: SEARCH, criteria }
}
