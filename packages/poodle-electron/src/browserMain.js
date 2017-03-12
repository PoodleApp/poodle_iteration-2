/* @flow */

import ApolloClient             from 'apollo-client'
import createHistory            from 'history/createHashHistory'
import MuiThemeProvider         from 'material-ui/styles/MuiThemeProvider'
import { GraphQLImapInterface } from 'poodle-core/lib/transport'
import React                    from 'react'
import { ApolloProvider }       from 'react-apollo'
import * as ReactDOM            from 'react-dom'
import { ConnectedRouter }      from 'react-router-redux'
import * as r3                  from 'react-router-redux'
import injectTapEventPlugin     from 'react-tap-event-plugin'
import * as redux               from 'redux'
import createLogger             from 'redux-logger'
import sagaMiddleware           from 'redux-saga'
import App                      from './components/App'
import buildRootReducer         from './reducers'
import sagas                    from './sagas'
import poodleTheme              from './themes/poodle'

import type { State } from './reducers'

// Adds support for `onTouchTap` to React components
injectTapEventPlugin()

const client = new ApolloClient({
  networkInterface: new GraphQLImapInterface()
})

const history = createHistory()

const saga = sagaMiddleware()

const enhancer = redux.compose(
  redux.applyMiddleware(
    createLogger(),
    saga,
    client.middleware(),
    r3.routerMiddleware(history),
  ),
  typeof window.devToolsExtension !== 'undefined'
    ? window.devToolsExtension()
    : f => f
)

const store = redux.createStore(
  buildRootReducer(client, r3.routerReducer),
  enhancer
)

saga.run(sagas)

function RootComponent(): React.Element<*> {
  return <MuiThemeProvider muiTheme={poodleTheme}>
    <ApolloProvider store={store} client={client}>
      <ConnectedRouter history={history}>
        <App />
      </ConnectedRouter>
    </ApolloProvider>
  </MuiThemeProvider>
}


export function main(root: Element) {
  ReactDOM.render(<RootComponent />, root)
}
