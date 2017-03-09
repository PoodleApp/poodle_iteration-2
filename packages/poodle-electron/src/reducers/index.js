/* @flow */

import ApolloClient                          from 'apollo-client'
import auth,   { type State as AuthState }   from 'poodle-core/lib/reducers/auth'
import chrome, { type State as ChromeState } from 'poodle-core/lib/reducers/chrome'
import { combineReducers }                   from 'redux'

import type { Reducer } from 'redux'

export type State = {
  apollo: Object,
  auth:   AuthState,
  chrome: ChromeState,
}

export default function buildRootReducer(client: ApolloClient): Reducer<State, *> {
  return combineReducers({
    apollo: client.reducer(),
    auth,
    chrome,
  })
}
