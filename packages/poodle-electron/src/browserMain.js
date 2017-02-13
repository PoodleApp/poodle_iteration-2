/* @flow */

import ApolloClient             from 'apollo-client'
import MuiThemeProvider         from 'material-ui/styles/MuiThemeProvider'
import buildRootReducer         from 'poodle-core/lib/reducers'
import { GraphQLImapInterface } from 'poodle-core/lib/transport'
import React                    from 'react'
import * as ReactDOM            from 'react-dom'
import { ApolloProvider }       from 'react-apollo'
import injectTapEventPlugin     from 'react-tap-event-plugin'
import * as redux               from 'redux'
import sagaMiddleware           from 'redux-saga'
import App                      from './components/App'
import sagas                    from './sagas'

import type { Store } from 'redux'

// Adds support for `onTouchTap` to React components
injectTapEventPlugin()

const client = new ApolloClient({
  networkInterface: new GraphQLImapInterface()
})

const saga = sagaMiddleware()

const store = redux.createStore(
  buildRootReducer(client),
  redux.compose(
    redux.applyMiddleware(client.middleware(), saga),
    typeof window.devToolsExtension !== 'undefined'
      ? window.devToolsExtension()
      : f => f
  )
)

saga.run(sagas)

export function RootComponent(): React.Element<*> {
  return <ApolloProvider store={store} client={client}>
    <MuiThemeProvider>
      <App />
    </MuiThemeProvider>
  </ApolloProvider>
}

export function main(root: Element) {
  ReactDOM.render(<RootComponent />, root)
}
