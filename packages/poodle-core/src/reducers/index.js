/* @flow */

import ApolloClient        from 'apollo-client'
import { combineReducers } from 'redux'
import activityStream      from './activityStream'
import auth                from './auth'
import chrome              from './chrome'

import type { Reducer }                      from 'redux'
import type { State as ActivityStreamState } from './activityStream'
import type { State as AuthState }           from './auth'
import type { State as ChromeState }         from './chrome'

export type State = {
  activityStream: ActivityStreamState,
  apollo:         Object,
  auth:           AuthState,
  chrome:         ChromeState,
}

export default function buildRootReducer(client: ApolloClient): Reducer<*> {
  const reducers = {
    activityStream,
    apollo: client.reducer(),
    auth,
    chrome,
  }
  return combineReducers(reducers)
}
