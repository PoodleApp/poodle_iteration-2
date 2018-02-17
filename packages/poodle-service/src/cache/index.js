/* @flow */

import * as Part from 'arfe/lib/models/MessagePart'
import * as fs from 'fs'
import * as DB from './indexeddb'
import migrations from './migrations'
import { fetchContentByUri, getPartRecord } from './query'

export * from './persist'
export * from './query'
export * from './types'
export type { DB } from './indexeddb'

export function initialize (): Promise<DB.DB> {
  return DB.requestDb({ name: 'poodle', migrations })
}
