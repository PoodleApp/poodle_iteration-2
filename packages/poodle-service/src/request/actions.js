/* @flow */

import { type HeaderValue } from 'arfe/lib/models/Message'
import * as imap from 'imap'

export const END = 'imapRequest/end'
export const FETCH_BODY = 'imapRequest/fetchBody'
export const FETCH_ATTRIBUTES = 'imapRequest/fetchAttributes'
export const FETCH_ATTRIBUTES_AND_HEADERS = 'imapRequest/fetchAttributesAndHeaders'
export const GET_BOX = 'imapRequest/getBox'
export const GET_BOXES = 'imapRequest/getBoxes'
export const GET_CAPABILITIES = 'imapRequest/getCapabilities'
export const SEARCH = 'imapRequest/search'

export type Action<T> =
  | { type: typeof END }
  | {
      type: typeof FETCH_ATTRIBUTES,
      source: imap.MessageSource,
      options: imap.FetchOptions
    }
  | {
      type: typeof FETCH_ATTRIBUTES_AND_HEADERS,
      source: imap.MessageSource,
      options: imap.FetchOptions
    }
  | {
      type: typeof FETCH_BODY,
      source: imap.MessageSource,
      options: imap.FetchOptions,
      encoding: ?string
    }
  | { type: typeof GET_BOX }
  | { type: typeof GET_BOXES, nsPrefix?: string }
  | { type: typeof GET_CAPABILITIES }
  | { type: typeof SEARCH, criteria: any[] }

export function end (): Action<void> {
  return { type: END }
}

export function fetchAttributes (
  source: imap.MessageSource,
  options: imap.FetchOptions = {}
): Action<imap.MessageAttributes> {
  return { type: FETCH_ATTRIBUTES, source, options }
}

export type SerializedHeaders = [[string, HeaderValue]]

export function fetchAttributesAndHeaders (
  source: imap.MessageSource,
  options: imap.FetchOptions = {}
): Action<{ attributes: imap.MessageAttributes, headers: SerializedHeaders }> {
  return { type: FETCH_ATTRIBUTES_AND_HEADERS, source, options }
}

export function fetchBody (
  source: imap.MessageSource,
  options: imap.FetchOptions = {},
  encoding?: string
): Action<Buffer> {
  return { type: FETCH_BODY, source, options, encoding }
}

export function getBox (): Action<?imap.Box> {
  return { type: GET_BOX }
}

export function getBoxes (nsPrefix?: string): Action<imap.BoxList> {
  return nsPrefix ? { type: GET_BOXES, nsPrefix } : { type: GET_BOXES }
}

export function getCapabilities (): Action<string[]> {
  return { type: GET_CAPABILITIES }
}

export function search (criteria: any[]): Action<imap.UID[]> {
  return { type: SEARCH, criteria }
}
