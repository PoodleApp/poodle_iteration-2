/* @flow */

import createHistory from 'history/createBrowserHistory'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import * as imap from 'poodle-core/lib/imap-redux'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { ConnectedRouter } from 'react-router-redux'
import * as r3 from 'react-router-redux'
import injectTapEventPlugin from 'react-tap-event-plugin'
import * as redux from 'redux'
import reduxLogger from 'redux-logger'
import sagaMiddleware from 'redux-saga'
import App from './components/App'
import imapClient from './imapClient'
import buildRootReducer from './reducers'
import sagas from './sagas'
import poodleTheme from './themes/poodle'

import type { State } from './reducers'

// Adds support for `onTouchTap` to React components
injectTapEventPlugin()

const history = createHistory()
const saga = sagaMiddleware()

const enhancer = redux.compose(
  imap.enhancer(imapClient),
  redux.applyMiddleware(reduxLogger, saga, r3.routerMiddleware(history)),
  typeof window.devToolsExtension !== 'undefined'
    ? window.devToolsExtension()
    : f => f
)

const store = redux.createStore(buildRootReducer(r3.routerReducer), enhancer)

// Run the IMAP service in the renderer process in development so that we can
// use the Webkit debugger, and reload code changes easily. Eventually we will
// run the service in the main process when running in production.
let imapService
// if (process.env.NODE_ENV === 'development') {
  imapService = require('./imapService')
// }

saga.run(sagas)

function RootComponent (): React.Element<*> {
  return (
    <MuiThemeProvider muiTheme={poodleTheme}>
      <Provider store={store}>
        <ConnectedRouter history={history}>
          <App />
        </ConnectedRouter>
      </Provider>
    </MuiThemeProvider>
  )
}

export function main (root: Element) {
  ReactDOM.render(<RootComponent />, root)
}
