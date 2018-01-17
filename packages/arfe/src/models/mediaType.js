/* @flow */

import { type MediaType, fromString } from 'media-type'
export { fromString } from 'media-type'

export function isCompatible (
  expectedType: MediaType,
  actualType: MediaType
): boolean {
  return (
    expectedType.type === actualType.type &&
    expectedType.subtype === actualType.subtype
  )
}

export function isHtml (mediaType: string): boolean {
  const m = fromString(mediaType)
  return m.type === 'text' && m.subtype === 'html'
}

export function isText (mediaType: string): boolean {
  const m = fromString(mediaType)
  return m.type === 'text'
}
