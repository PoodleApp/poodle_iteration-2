/* @flow */

import type { Action } from './actions'
import * as selectors from './selectors'
import type { Slurp, State } from './types'

export default function reducer (state: State = {}, action: Action): State {
  switch (action.type) {
    case 'slurp/on-value':
      return updateSingle(action, state, {
        value: action.value,
        latest: action.value
      })
    case 'slurp/on-error':
      return updateSingle(action, state, {
        error: action.error,
        latest: action.error
      })
    case 'slurp/on-complete':
      return updateSingle(action, state, { complete: true })
    default:
      return state
  }
}

function updateSingle<V, E> (
  action: Action,
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
