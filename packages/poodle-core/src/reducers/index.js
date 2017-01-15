/* @flow */

import ApolloClient from 'apollo-client'
import { combineReducers } from 'redux'

// TODO
import type { Reducer } from 'redux'

export type State = {
  apollo: Object,
}

export default function buildRootReducer(client: ApolloClient): Reducer<*> {
  const reducers: $Shape<State> = {
    // TOOD: application reducers here
    apollo: client.reducer(),
  }
  return combineReducers(reducers)
}
