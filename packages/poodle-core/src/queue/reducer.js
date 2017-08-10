/*
 * Defines state for queued network operations, such as sending likes
 *
 * @flow
 */

import { type URI } from 'arfe/lib/models/uri'
import * as actions from './actions'

export type State = {
  pendingLikes?: URI[]
}

export const initialState = {}

export default function reducer (
  state: State = initialState,
  action: actions.Action
): State {
  switch (action.type) {
    case actions.SENDING_LIKES:
      return {
        ...state,
        pendingLikes: (state.pendingLikes || []).concat(action.likedObjectUris)
      }
    case actions.DONE_SENDING_LIKES:
      return {
        ...state,
        pendingLikes: (state.pendingLikes || [])
          .filter(uri => !action.likedObjectUris.includes(uri))
      }
    default:
      return state
  }
}
