/*
 * @flow
 */

import { type BoxSpecifier } from './types'

export const AUTHENTICATED = 'connectionState/authenticated'
export const OPEN_BOX = 'connectionState/openBox'

export type ConnectionState =
  | { type: typeof AUTHENTICATED }
  | { type: typeof OPEN_BOX, box: BoxSpecifier, readonly: boolean }

export const authenticated: ConnectionState = { type: AUTHENTICATED }

export function openBox(box: BoxSpecifier, readonly: boolean): ConnectionState {
  return { type: OPEN_BOX, box, readonly }
}
