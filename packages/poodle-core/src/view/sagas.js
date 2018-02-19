/* @flow */

import type Message from 'arfe/lib/models/Message'
import * as Part from 'arfe/lib/models/MessagePart'
import * as fs from 'fs'
import * as kefir from 'kefir'
import * as tasks from 'poodle-service/lib/tasks'
import * as promises from 'poodle-service/lib/util/promises'
import { type Effect, all, call, fork, takeEvery } from 'redux-saga/effects'
import { type Readable } from 'stream'
import * as tmp from 'tmp'
import { type Account } from '../actions/auth'
import * as actions from './actions'

export interface Dependencies {
  openExternal: (filePath: string) => mixed,
  perform: tasks.Perform
}

function * openAttachment (
  deps: Dependencies,
  action: actions.Action
): Generator<Effect, void, any> {
  if (action.type !== actions.OPEN_ATTACHMENT) {
    return
  }
  const { message, account, attachment } = action
  const ref = Part.getRef(attachment)
  const { path: tempFile, cleanup } = yield call(getTempFile)
  const content = yield call(fetchPartContent, message, ref, account, deps)
  yield call(writeOutContent, tempFile, content)
  deps.openExternal(tempFile)
}

function fetchPartContent (
  message: Message,
  ref: Part.PartRef,
  account: Account,
  { perform }: Dependencies
): Promise<Readable> {
  return perform(tasks.fetchPartContent, [message, ref], {
    accountName: account.email
  }).toPromise()
}

function getTempFile (): Promise<{ path: string, cleanup: () => mixed }> {
  return new Promise((resolve, reject) => {
    tmp.file((err, path, fd, cleanup) => {
      if (err) {
        reject(err)
      } else {
        resolve({ path, cleanup })
      }
    })
  })
}

function writeOutContent (filePath: string, input: Readable): Promise<void> {
  const output = fs.createWriteStream(filePath, { mode: 0o600 })
  input.pipe(output)
  return new Promise(resolve => {
    output.on('close', resolve)
  })
}

export default function * root (
  deps: Dependencies
): Generator<Effect, void, any> {
  yield all([fork(takeEvery, actions.OPEN_ATTACHMENT, openAttachment, deps)])
}
