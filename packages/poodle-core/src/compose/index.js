/* @flow */

import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import Conversation from 'arfe/lib/models/Conversation'
import { connect } from 'react-redux'
import { type Dispatch, applyMiddleware, createStore } from 'redux'
import { local } from 'redux-fractal'
import createSagaMiddleware from 'redux-saga'
import * as compose from './actions'
import reducer, { type State } from './reducer'
import rootSaga from './sagas'

type ExpectedProps = {
  activity?: DerivedActivity,
  conversation: Conversation
}

export type ComposeProps = State & {
  dispatch: (action: any) => void,
  onContentChange: typeof compose.setContent,
  onEdit: typeof compose.edit,
  onSend: typeof compose.send
}

export function ComposeHOC<OwnProps: ExpectedProps, TopState: Object> (
  component: *
) {
  return local({
    key: (props: OwnProps) =>
      props.activity
        ? `edit-${props.activity.id}`
        : `reply-${props.conversation.id}`,
    createStore: (props: OwnProps) => {
      const sagaMiddleware = createSagaMiddleware()
      const store = createStore(reducer, applyMiddleware(sagaMiddleware))
      sagaMiddleware.run(rootSaga)
      // TODO
      // return { store, cleanup: () => sagaMiddleware.cancel() }
      return store
    },
    mapDispatchToProps
  })(component)
}

function mapDispatchToProps (dispatch: Dispatch<*>) {
  return {
    dispatch,
    onContentChange (...args) {
      dispatch(compose.setContent(...args))
    },
    onEdit (...args) {
      dispatch(compose.edit(...args))
    },
    onSend (...args) {
      dispatch(compose.send(...args))
    }
  }
}
