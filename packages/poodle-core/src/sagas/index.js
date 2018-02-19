/* @flow */

import { type OauthCredentials } from 'poodle-service/lib/models/ImapAccount'
import { type Effect, all, fork } from 'redux-saga/effects'
import * as compose from '../compose'
import queueSaga from '../queue/saga'
import authSaga, { type Dependencies } from './auth'
import chromeSaga from './chrome'

export type { Dependencies } from './auth'

export default function * root (
  authDeps: Dependencies
): Generator<Effect, void, any> {
  const { perform } = authDeps
  yield all([
    fork(authSaga, authDeps),
    fork(chromeSaga, { perform }),
    fork(compose.sagas, { perform }),
    fork(queueSaga, { perform })
  ])
}
