/* @flow */

import * as imap from 'imap'
import type Connection from 'imap'
import * as kefir from 'kefir'
import * as kefirUtil from '../util/kefir'
import * as promises from '../util/promises'
import * as actions from './actions'
import alignState from './alignState'
import * as state from './state'
import { type BoxSpecifier } from './types'

export * from './state'
export * from './types'

export function perform<T> (
  action: actions.Action<T>,
  expectedState: ?state.ConnectionState,
  connection: Connection
): kefir.Observable<T, Error> {
  if (expectedState) {
    return kefir
      .fromPromise(alignState(expectedState, connection))
      .flatMap(() => _perform(action, connection))
  } else {
    return _perform(action, connection)
  }
}

// TODO:
// execute: (action, state, conn) => Promise<value>

// Perform task *after* connection state has been adjusted to meet expectations
// of the given action.
function _perform (
  action: actions.Action<any>,
  connection: Connection
): kefir.Observable<any, Error> {
  switch (action.type) {
    case actions.FETCH:
      return kefirUtil.fromEventsWithEnd(
        connection.fetch(action.source, action.options),
        'message',
        (msg, seqno) => msg
      )
    case actions.GET_BOX:
      return kefir.constant((connection: any)._box)
    case actions.GET_CAPABILITIES:
      return kefir.constant(connection._caps || [])
    case actions.SEARCH:
      const criteria = action.criteria
      return kefir.fromNodeCallback(cb => connection.search(criteria, cb))
    default:
      return kefir.constantError(
        new Error(`unknown request type: ${action.type}`)
      )
  }
}
