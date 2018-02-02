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

// This function is called from the main process via electron-remote
// TODO: attempt to download content if it is not in cache?
export async function writePartContentToFile (
  uri: string,
  tempFile: string
): Promise<{ contentType: string }> {
  const db = await initialize()
  const [part, _] = await Promise.all([
    getPartRecord(uri, db),
    writeOutPartContent(uri, tempFile, db)
  ])
  return {
    contentType: Part.contentType(part.part)
  }
}

async function writeOutPartContent (
  uri: string,
  tempFile: string,
  db: DB.DB
): Promise<void> {
  const input = await fetchContentByUri(uri, db)
  const output = fs.createWriteStream(tempFile, { mode: 0o600 })
  input.pipe(output)
  return new Promise(resolve => {
    output.on('close', resolve)
  })
}
