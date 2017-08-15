/* @flow */

import composeComment from 'arfe/lib/compose/comment'
import Sync from 'poodle-service/lib/sync'
import {
  type Effect,
  all,
  call,
  fork,
  put,
  takeEvery
} from 'redux-saga/effects'
import stringToStream from 'string-to-stream'
import * as chrome from '../actions/chrome'
import * as compose from './actions'

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

function * sendReply (
  sync: Sync,
  action: compose.Action
): Generator<Effect, void, any> {
  if (action.type !== compose.SEND) {
    return
  }
  const { account, conversation, recipients, content } = action
  const message = composeComment({
    ...recipients,
    content: {
      mediaType: content.mediaType,
      stream: stringToStream(content.string)
    },
    conversation
  })
  try {
    yield put(compose.sending())
    const result = yield call([sync, 'send'], message)
    console.log('DeliveryResult')
    console.dir(result)
    yield put(compose.sent())
  } catch (err) {
    yield put(chrome.showError(err))
  }
}

export default function * root (sync: Sync): Generator<Effect, void, any> {
  yield all([fork(takeEvery, compose.SEND, sendReply, sync)])
}
