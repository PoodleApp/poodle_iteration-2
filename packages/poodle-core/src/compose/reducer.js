/* @flow */

import * as compose from './actions'
import { type Action } from './actions'

export type State = {
  content: ?string,
  sending: boolean
}

export const initialState = {
  content: null,
  sending: false
}

export default function reducer(state: State = initialState, action: Action): State {
  switch (action.type) {
    case compose.SENDING:
      return {
        ...state,
        sending: true
      }
    case compose.SENT:
      return {
        ...state,
        content: '',
        sending: false
      }
    case compose.SET_CONTENT:
      return {
        ...state,
        content: action.content
      }
    default:
      return state
  }
}
