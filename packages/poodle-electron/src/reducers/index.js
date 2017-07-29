/* @flow */

import auth, { type State as AuthState } from 'poodle-core/lib/reducers/auth'
import chrome, {
  type State as ChromeState
} from 'poodle-core/lib/reducers/chrome'
import * as slurp from 'poodle-core/lib/slurp'
import { combineReducers } from 'redux'
import { localReducer } from 'redux-fractal'

import type { Reducer } from 'redux'

export type State = {
  auth: AuthState,
  chrome: ChromeState,
  local: Object,
  router: Object,
  slurp: slurp.State
}

export default function buildRootReducer (
  routerReducer: Reducer<Object, any>
): Reducer<State, *> {
  return combineReducers({
    auth,
    chrome,
    local: localReducer,
    router: routerReducer,
    slurp: slurp.reducer
  })
}
