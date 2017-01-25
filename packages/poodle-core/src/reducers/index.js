/* @flow */

import ApolloClient        from 'apollo-client'
import { combineReducers } from 'redux'
import activityStream      from './activityStream'

// TODO
import type { Reducer }                      from 'redux'
import type { State as ActivityStreamState } from './activityStream'

export type State = {
  activityStream: ActivityStreamState,
  apollo:         Object,
}

export default function buildRootReducer(client: ApolloClient): Reducer<*> {
  const reducers = {
    activityStream,
    apollo: client.reducer(),
  }
  return combineReducers(reducers)
}
