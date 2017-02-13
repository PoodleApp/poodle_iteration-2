/*
 * Maintain state related to bits of UI that are tangential to content
 *
 * @flow
 */

import type { Action } from '../actions/chrome'

export type State = {
  error?:             ?Error,
  leftNavOpen:        boolean,
  loadingIndicators?: Indicator[],
  notification?:      ?string,
}

type Indicator = { key: string, message: string }

const inititialState: State = {
  leftNavOpen: false,
}

export default function reducer(state: State = inititialState, action: Action): State {
  switch (action.type) {
    case 'dismissError':
      return {
        ...state,
        error: null,
      }
    case 'dismissNotify':
      return {
        ...state,
        notification: null,
      }
    case 'leftNavToggle':
      const open = typeof action.open === 'boolean' ? action.open : !state.leftNavOpen
      return {
        ...state,
        leftNavOpen: open,
      }
    case 'showError':
      return {
        ...state,
        error: action.error,
      }
    case 'showNotification':
      return {
        ...state,
        notification: action.notification,
      }
    case 'indicateLoading':
      return incrementIndicator(action, state)
    case 'doneLoading':
      return decrementIndicator(action.key, state)
    default:
      return state
  }
}

export function isLoading(state: State): boolean {
  return !!state.loadingIndicators && state.loadingIndicators.length > 0
}

export function loadingMessage(state: State): ?string {
  const l = state.loadingIndicators && state.loadingIndicators[0]
  return l && l.message
}

function incrementIndicator(action: Indicator, state: State): State {
  const ls = state.loadingIndicators || []
  return {
    ...state,
    loadingIndicators: ls.concat(action)
  }
}

function decrementIndicator(key: string, state: State): State {
  const allIndicators = state.loadingIndicators || []
  const matching      = allIndicators.filter(i => i.key === key)
  const others        = allIndicators.filter(i => i.key !== key)
  return {
    ...state,
    loadingIndicators: others.concat(matching.slice(1))
  }
}
