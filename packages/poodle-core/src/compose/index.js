/* @flow */

import Conversation from 'arfe/lib/models/Conversation'
import Sync from 'poodle-service/lib/sync'
import { connect } from 'react-redux'
import { type Dispatch, applyMiddleware, createStore } from 'redux'
import { local } from 'redux-fractal'
import createSagaMiddleware from 'redux-saga'
import { type State as AuthState } from '../reducers/auth'
import * as compose from './actions'
import reducer, { type State, initialState } from './reducer'
import rootSaga from './sagas'

type ExpectedProps = {
  conversation: Conversation,
  sync: Sync
}

export function ComposeHOC<OwnProps: ExpectedProps, TopState: { auth: AuthState }> (component: *) {
  const withCompose = local({
    key: (props: OwnProps) => `compose-${props.conversation.id}`,
    createStore: (props: OwnProps) => {
      const sagaMiddleware = createSagaMiddleware()
      const store = createStore(reducer, applyMiddleware(sagaMiddleware))
      sagaMiddleware.run(rootSaga, props.sync)
      // TODO
      // return { store, cleanup: () => sagaMiddleware.cancel() }
      return store
    },
    mapDispatchToProps
  })(component)

  const withSync = connect(({ auth }: TopState) => ({
    sync: auth.sync
  }))(withCompose)

  return withSync
}

function mapDispatchToProps (dispatch: Dispatch<*>) {
  return {
    onContentChange(...args) {
      dispatch(compose.setContent.apply(null, args))
    },
    onSend (...args) {
      dispatch(compose.send.apply(null, args))
    }
  }
}
