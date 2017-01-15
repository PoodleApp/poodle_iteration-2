/* @flow */

import ApolloClient       from 'apollo-client'
import React              from 'react'
import { ApolloProvider } from 'react-apollo'
import ReactDOM           from 'react-dom'
import * as redux         from 'redux'
import App                from './components/App'
import buildRootReducer   from './reducers'

const client = new ApolloClient()

const store = redux.createStore(
  buildRootReducer(client),
  redux.compose(
    redux.applyMiddleware(client.middleware()),
    typeof window.devToolsExtension !== 'undefined'
      ? window.devToolsExtension()
      : f => f
  )
)

ReactDOM.render(
  <ApolloProvider store={store} client={client}>
    <App />
  </ApolloProvider>,
  document.getElementById('root')
)
