/* @flow */

// TODO: these sagas should probably be moved to `imap-redux`, or to top-level
// sagas

import * as compose from 'arfe/lib/compose'
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
import * as composeActions from './actions'

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

function * sendEdit (
  action: composeActions.Action
): Generator<Effect, void, any> {
  if (action.type !== composeActions.EDIT) {
    return
  }
  const { account, activity, conversation, recipients, content } = action
  const message = compose.edit({
    ...recipients,
    content: {
      mediaType: content.mediaType,
      stream: stringToStream(content.string)
    },
    conversation,
    activity
  })
  yield * transmit(message)
}

function * sendReply (
  action: composeActions.Action
): Generator<Effect, void, any> {
  if (action.type !== composeActions.SEND) {
    return
  }
  const { account, conversation, recipients, content } = action
  const message = compose.comment({
    ...recipients,
    content: {
      mediaType: content.mediaType,
      stream: stringToStream(content.string)
    },
    conversation
  })
  yield * transmit(message)
}

// TODO: update this to send transmit action through IMAP `Client`
function * transmit (
  message: compose.MessageConfiguration
): Generator<Effect, void, any> {
  yield put(chrome.showError(new Error('Sending messages is not implemented at the moment')))
  // try {
  //   yield put(composeActions.sending())
  //   const result = yield call([sync, 'send'], message)
  //   console.log('DeliveryResult')
  //   console.dir(result)
  //   yield put(composeActions.sent())
  // } catch (err) {
  //   yield put(chrome.showError(err))
  // }
}

export default function * root (): Generator<Effect, void, any> {
  yield all([
    fork(takeEvery, composeActions.EDIT, sendEdit),
    fork(takeEvery, composeActions.SEND, sendReply)
  ])
}
