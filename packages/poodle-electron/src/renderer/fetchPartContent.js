/*
 * These functions are called from the main process via electron-remote.
 *
 * @flow
 */

import * as Part from 'arfe/lib/models/MessagePart'
import * as fs from 'fs'
import * as kefir from 'kefir'
import * as tasks from 'poodle-service/lib/tasks'
import * as promises from 'poodle-service/lib/util/promises'
import { _perform } from '../imapClient'

// TODO: stream part content over IPC instead of using temporary file
export async function writePartContentToFile (
  uri: string,
  tempFile: string
): Promise<{ contentType: string }> {
  const [part, content] = await Promise.all([
    fetchPart(uri),
    writeOutPartContent(uri, tempFile)
  ])
  return {
    contentType: Part.contentType(part)
  }
}

async function fetchPart (uri): Promise<Part.MessagePart> {
  const { part } = await promises.failOnUndefined(
    _perform(tasks.fetchPartByUri, [uri]).toPromise()
  )
  return part
}

async function writeOutPartContent (
  uri: string,
  tempFile: string
): Promise<void> {
  const input = await promises.failOnUndefined(
    _perform(tasks.fetchPartContentByUri, [uri]).toPromise()
  )
  const output = fs.createWriteStream(tempFile, { mode: 0o600 })
  input.pipe(output)
  return new Promise(resolve => {
    output.on('close', resolve)
  })
}
