/*
 * Defines state for queued network operations, such as sending likes
 *
 * @flow
 */

import { type URI } from 'arfe/lib/models/uri'
import * as actions from './actions'

export type State = {
  pendingLikes?: URI[],
  sending?: URI[]
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
      const { likedObjectUris } = action
      return {
        ...state,
        pendingLikes: (state.pendingLikes || [])
          .filter(uri => !likedObjectUris.includes(uri))
      }
    case actions.SENDING:
      return {
        ...state,
        sending: (state.sending || []).concat(action.messageUris)
      }
    case actions.DONE_SENDING:
      const { messageUris } = action
      return {
        ...state,
        sending: (state.sending || [])
          .filter(uri => !messageUris.includes(uri))
      }
    default:
      return state
  }
}
