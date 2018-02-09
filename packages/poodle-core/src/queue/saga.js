/* @flow */

import * as compose from 'arfe/lib/compose'
import composeLike from 'arfe/lib/compose/like'
import * as Addr from 'arfe/lib/models/Address'
import Message from 'arfe/lib/models/Message'
import * as cache from 'poodle-service/lib/cache'
import * as tasks from 'poodle-service/lib/tasks'
import {
  type Effect,
  all,
  call,
  fork,
  put,
  select,
  takeEvery
} from 'redux-saga/effects'
import stringToStream from 'string-to-stream'
import { type Account } from '../actions/auth'
import * as chrome from '../actions/chrome'
import * as queue from './actions'

export interface Dependencies {
  perform: tasks.Perform
}

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

function * sendLike (
  deps: Dependencies,
  action: queue.Action
): Generator<Effect, void, any> {
  if (action.type !== queue.SEND_LIKES) {
    return
  }

  const { account, conversation, likedObjectUris, recipients } = action
  const messageBuilder = composeLike({
    ...recipients,
    conversation,
    fallbackContent: {
      // TODO: read custom fallback content preference from `account`
      mediaType: 'text/html',
      stream: stringToStream('+1')
    },
    likedObjectUris
  })
  try {
    yield put(queue.sendingLikes(action.likedObjectUris))
    yield * transmit(deps, account, messageBuilder)
  } finally {
    yield put(queue.doneSendingLikes(action.likedObjectUris))
  }
}

function * transmit (
  deps: Dependencies,
  account: Account,
  messageBuilder: compose.Builder<Message>
): Generator<Effect, void, any> {
  const sender = Addr.build(account)
  const { message, parts } = yield compose.build(messageBuilder, sender)
  yield put(queue.sending([message.uri]))

  try {
    // write copy of message and content to local cache
    const messageRecord = cache.messageToRecord(message)
    yield deps.perform(
      tasks.storeLocalCopyOfMessage,
      [messageRecord, parts],
      {
        accountName: account.email
      }
    ).toPromise()

    // recording local record consumes content streams, so read content back
    // from database to serialize message for transmission
    const serialized = yield deps.perform(
      tasks.serialize,
      [message],
      {
        accountName: account.email
      }
    ).toPromise()

    // transmit the message
    const result = yield deps.perform(
      tasks.sendMail,
      [serialized],
      {
        accountName: account.email
      }
    ).toPromise()
  } catch (err) {
    yield put(chrome.showError(err))
    throw err
  } finally {
    yield put(queue.doneSending([message.uri]))
  }
}

export default function * root (
  deps: Dependencies
): Generator<Effect, void, any> {
  yield all([
    fork(takeEvery, queue.SEND_LIKES, sendLike, deps)
  ])
}
