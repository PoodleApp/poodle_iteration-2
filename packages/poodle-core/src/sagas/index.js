/* @flow */

import { type OauthCredentials } from 'poodle-service/lib/models/ImapAccount'
import { type Effect } from 'redux-saga'
import { all, fork } from 'redux-saga/effects'
import * as compose from '../compose'
import queueSaga from '../queue/saga'
import viewSaga, { type Dependencies as ViewDeps } from '../view/sagas'
import authSaga, { type Dependencies as AuthDeps } from './auth'
import chromeSaga from './chrome'

export interface Dependencies extends AuthDeps, ViewDeps {}

export default function * root (
  authDeps: Dependencies
): Generator<Effect, void, any> {
  const { openExternal, perform } = authDeps
  yield all([
    fork(authSaga, authDeps),
    fork(chromeSaga, { perform }),
    fork(compose.sagas, { perform }),
    fork(queueSaga, { perform }),
    fork(viewSaga, { openExternal, perform })
  ])
}
