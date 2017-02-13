/* @flow */

import ApolloClient        from 'apollo-client'
import { combineReducers } from 'redux'
import activityStream      from './activityStream'
import chrome              from './chrome'

// TODO
import type { Reducer }                      from 'redux'
import type { State as ActivityStreamState } from './activityStream'
import type { State as ChromeState }         from './chrome'

export type State = {
  activityStream: ActivityStreamState,
  apollo:         Object,
  chrome:         ChromeState,
}

export default function buildRootReducer(client: ApolloClient): Reducer<*> {
  const reducers = {
    activityStream,
    apollo: client.reducer(),
    chrome, chrome,
  }
  return combineReducers(reducers)
}
