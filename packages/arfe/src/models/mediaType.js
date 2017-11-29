/* @flow */

import { type MediaType } from 'media-type'
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
