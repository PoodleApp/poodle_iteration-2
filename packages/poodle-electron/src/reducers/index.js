/* @flow */

import chrome, {
  type State as ChromeState
} from 'poodle-core/lib/reducers/chrome'
import { type State as ImapState, reducer as imap } from 'poodle-core/lib/imap-redux'
import queue, { type State as QueueState } from 'poodle-core/lib/queue/reducer'
import auth, { type State as AuthState } from 'poodle-core/lib/reducers/auth'
import * as slurp from 'poodle-core/lib/slurp'
import { combineReducers } from 'redux'
import { localReducer } from 'redux-fractal'

import type { Reducer } from 'redux'

export type State = {
  auth: AuthState,
  chrome: ChromeState,
  imap: ImapState,
  local: Object,
  queue: QueueState,
  router: Object,
  slurp: slurp.State
}

export default function buildRootReducer (
  routerReducer: Reducer<Object, any>
): Reducer<State, *> {
  return combineReducers({
    auth,
    chrome,
    imap,
    local: localReducer,
    queue,
    router: routerReducer,
    slurp: slurp.reducer
  })
}
