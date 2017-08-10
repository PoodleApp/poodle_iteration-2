/* @flow */

import * as actions from './actions'
import * as selectors from './selectors'
import type { Slurp, State } from './types'

export default function reducer (state: State = {}, action: actions.Action): State {
  switch (action.type) {
    case actions.ON_VALUE:
      return updateSingle(action, state, {
        value: action.value,
        latest: action.value
      })
    case actions.ON_ERROR:
      return updateSingle(action, state, {
        error: action.error,
        latest: action.error
      })
    case actions.ON_COMPLETE:
      return updateSingle(action, state, { complete: true })
    case actions.CLEANUP:
      return removeComponentState(action, state)
    default:
      return state
  }
}

function updateSingle<V, E> (
  action: actions.Action,
  state: State,
  changes: $Shape<Slurp<V, E>>
): State {
  const slurps = selectors.subscriptionStates(state, action.componentKey)
  const slurp = selectors.subscriptionState(
    state,
    action.componentKey,
    action.propName
  )
  const updatedSlurp = { ...slurp, ...changes }
  return {
    ...state,
    componentStates: {
      ...(state.componentStates || {}),
      [action.componentKey]: {
        ...slurps,
        [action.propName]: updatedSlurp
      }
    }
  }
}

function removeComponentState (action: actions.Action, state: State): State {
  const { [action.componentKey]: _, ...remainingStates } =
    state.componentStates || {}
  return {
    ...state,
    componentStates: remainingStates
  }
}
