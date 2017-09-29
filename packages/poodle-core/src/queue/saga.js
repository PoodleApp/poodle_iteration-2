/* @flow */

import * as compose from 'arfe/lib/compose'
import composeLike from 'arfe/lib/compose/like'
import * as C from 'poodle-service/lib/ImapInterface/Client'
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
  imapClient: C.Client
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
  const message = composeLike({
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
    const result = yield C.perform(deps.imapClient, tasks.sendMail, [message], {
      accountName: account.email
    }).toPromise()
    yield put(queue.doneSendingLikes(action.likedObjectUris))
  } catch (err) {
    yield put(chrome.showError(err))
    yield put(queue.doneSendingLikes(action.likedObjectUris))
  }
}

export default function * root (
  deps: Dependencies
): Generator<Effect, void, any> {
  yield all([fork(takeEvery, queue.SEND_LIKES, sendLike, deps)])
}
