/* @flow */

import ApolloClient             from 'apollo-client'
import MuiThemeProvider         from 'material-ui/styles/MuiThemeProvider'
import React                    from 'react'
import { ApolloProvider }       from 'react-apollo'
import injectTapEventPlugin     from 'react-tap-event-plugin'
import * as redux               from 'redux'
import App                      from './components/App'
import buildRootReducer         from './reducers'
import { GraphQLImapInterface } from './transport'

import type { Store } from 'redux'

// Adds support for `onTouchTap` to React components
injectTapEventPlugin()

export function reduxStore(): [Store, ApolloClient] {
  const client = new ApolloClient({
    networkInterface: new GraphQLImapInterface()
  })

  const store = redux.createStore(
    buildRootReducer(client),
    {},  // initial state
    redux.compose(
      redux.applyMiddleware(client.middleware()),
      typeof window.devToolsExtension !== 'undefined'
        ? window.devToolsExtension()
        : f => f
    )
  )

  return [store, client]
}

export function RootComponent(): React.Element<*> {
  const [store, client] = reduxStore()
  return <ApolloProvider store={store} client={client}>
    <MuiThemeProvider>
      <App />
    </MuiThemeProvider>
  </ApolloProvider>
}
