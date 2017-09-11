/* @flow */

import composeLike from 'arfe/lib/compose/like'
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
import * as chrome from '../actions/chrome'
import * as queue from './actions'

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

function * sendLike (action: queue.Action): Generator<Effect, void, any> {
  if (action.type !== queue.SEND_LIKES) {
    return
  }

  // TODO: which account to send `like` from?

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
  // TOOD
  yield put(chrome.showError(new Error('Likes are not supported at the moment')))
  // try {
  //   yield put(queue.sendingLikes(action.likedObjectUris))
  //   const result = yield call([sync, 'send'], message)
  //   yield put(queue.doneSendingLikes(action.likedObjectUris))
  // } catch (err) {
  //   yield put(chrome.showError(err))
  //   yield put(queue.doneSendingLikes(action.likedObjectUris))
  // }
}

export default function * root (): Generator<Effect, void, any> {
  yield all([fork(takeEvery, queue.SEND_LIKES, sendLike)])
}
