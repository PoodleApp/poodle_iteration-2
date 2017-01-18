/* @flow */

import ApolloClient         from 'apollo-client'
import MuiThemeProvider     from 'material-ui/styles/MuiThemeProvider'
import React                from 'react'
import { ApolloProvider }   from 'react-apollo'
import injectTapEventPlugin from 'react-tap-event-plugin'
import * as redux           from 'redux'
import App                  from './components/App'
import buildRootReducer     from './reducers'

import type { Store } from 'redux'

// Adds support for `onTouchTap` to React components
injectTapEventPlugin()

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

export function RootComponent(): React.Element<*> {
  const client = new ApolloClient()
  const store  = reduxStore(client)
  return <ApolloProvider store={store} client={client}>
    <MuiThemeProvider>
      <App />
    </MuiThemeProvider>
  </ApolloProvider>
}
