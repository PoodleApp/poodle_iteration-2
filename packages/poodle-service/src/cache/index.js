/* @flow */

import * as DB from './indexeddb'
import migrations from './migrations'

export * from './persist'
export * from './query'
export * from './types'
export type { DB } from './indexeddb'

export function initialize (): Promise<DB.DB> {
  return DB.requestDb({ name: 'poodle', migrations })
}
