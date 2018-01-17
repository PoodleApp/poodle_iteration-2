/* @flow */

import { newMessageId } from 'arfe/lib/compose'
import * as Addr from 'arfe/lib/models/Address'
import * as router from 'react-router-redux'
import { type Effect } from 'redux-saga'
import { all, fork, put, takeEvery } from 'redux-saga/effects'
import * as actions from '../actions/chrome'

function * composeNewDiscussion (
  action: actions.Action
): Generator<Effect, void, any> {
  if (action.type !== actions.COMPOSE_NEW_DISCUSSION) {
    throw new Error(`unexpected action type: ${action.type}`)
  }
  const sender = Addr.build(action.account)
  const draftId = newMessageId(sender)
  yield put(
    router.push(`/compose/discussion?draftId=${encodeURIComponent(draftId)}`)
  )
}

export default function * root (): Generator<Effect, void, any> {
  yield all([
    fork(takeEvery, actions.COMPOSE_NEW_DISCUSSION, composeNewDiscussion)
  ])
}
