/* @flow */

import { type URI } from 'arfe/lib/models/uri'
import * as imap from 'imap'

export const FETCH_PARTS = 'imapAction/fetchParts'
export const FETCH_THREADS = 'imapAction/fetchThreads'
export const GET_CAPABILITIES = 'imapAction/getCapabilities'
export const SEARCH = 'imapAction/search'

export type Action =
  | {
      type: typeof FETCH_THREADS,
      box: string,
      source: imap.MessageSource
    }
  | {
      type: typeof FETCH_PARTS,
      box: string,
      source: imap.MessageSource
    }
  | {
      type: typeof GET_CAPABILITIES
    }
  | {
      type: typeof SEARCH,
      box: string,
      criteria: mixed[]
    }

export function fetchParts (opts: { box: string, source: imap.MessageSource }): Action {
  const box: string = opts.box
  const source: imap.MessageSource = opts.source
  return { type: FETCH_PARTS, box, source }
}

export function fetchThreads (opts: {
  box: string,
  source: imap.MessageSource
}): Action {
  const box: string = opts.box
  const source: imap.MessageSource = opts.source
  return { type: FETCH_THREADS, box, source }
}

export function getCapabilities (): Action {
  return { type: GET_CAPABILITIES }
}

export function search ({
  box,
  criteria
}: {
  box: string,
  criteria: mixed[]
}): Action {
  return { type: SEARCH, box, criteria }
}
