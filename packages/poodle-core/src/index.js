/* @flow */

import React              from 'react'
import * as redux         from 'redux'
import App                from './components/App'
import buildRootReducer   from './reducers'

import typeof ApolloClient from 'apollo-client'
import type { Store }      from 'redux'

export function reduxStore(client: ApolloClient): Store {
  return redux.createStore(
    buildRootReducer(client),
    redux.compose(
      redux.applyMiddleware(client.middleware()),
      typeof window.devToolsExtension !== 'undefined'
        ? window.devToolsExtension()
        : f => f
    )
  )
}
