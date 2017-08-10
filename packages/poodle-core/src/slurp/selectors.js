/* @flow */

import * as helpers from './helpers'
import type {
  ComponentKey,
  ComponentState,
  PropName,
  Slurp,
  State
} from './types'

export function props (
  state: State,
  key: ComponentKey,
  defaultProps: Object,
  reload: (propName: PropName) => () => void
): Object {
  const ss = subscriptionStates(state, key)
  const props = { ...defaultProps, ...ss }
  for (const key of Object.keys(props)) {
    if (helpers.isEffect(props[key])) {
      // Replace any Observables that are not yet represented in redux state
      props[key] = initSlurp(reload(key))
    }
  }
  return props
}

export function subscriptionStates (
  state: State,
  componentKey: ComponentKey
): { [key: PropName]: Slurp<any, any> } {
  if (!state.componentStates) {
    return {}
  }
  return state.componentStates[componentKey] || {}
}

export function subscriptionState (
  state: State,
  componentKey: ComponentKey,
  propName: PropName
): Slurp<any, any> {
  const ss = subscriptionStates(state, componentKey)
  return ss[propName] || initSlurp(noop)
}

function initSlurp<T, E> (reload: () => void): Slurp<T, E> {
  return { complete: false, reload }
}

function noop () {}
