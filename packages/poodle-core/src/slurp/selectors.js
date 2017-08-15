/* @flow */

import mapValues from 'lodash.mapvalues'
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
  const ss = mapValues(subscriptionStates(state, key), (s, propName) => ({
    ...s,
    reload: reload(propName)
  }))
  const props = { ...defaultProps, ...ss }
  for (const propName of Object.keys(props)) {
    if (helpers.isEffect(props[propName])) {
      // Replace any Observables that are not yet represented in redux state
      props[propName] = initSlurp(reload(propName))
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
