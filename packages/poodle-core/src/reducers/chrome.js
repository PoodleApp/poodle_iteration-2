/*
 * Maintain state related to bits of UI that are tangential to content
 *
 * @flow
 */

import { type URI } from 'arfe/lib/models/uri'
import * as actions from '../actions/chrome'

export type State = {
  editing?: URI[],
  errors?: Error[],
  leftNavOpen: boolean,
  loadingIndicators?: Indicator[],
  notification?: ?string,
  searchQuery?: ?string
}

type Indicator = { key: string, message: string }

const inititialState: State = {
  leftNavOpen: false
}

export default function reducer (
  state: State = inititialState,
  action: actions.Action
): State {
  switch (action.type) {
    case actions.START_EDITING:
      return {
        ...state,
        editing: (state.editing || []).concat(action.activityId)
      }
    case actions.STOP_EDITING:
      const activityId = action.activityId
      return {
        ...state,
        editing: (state.editing || []).filter(id => id !== activityId)
      }
    case actions.DISMISS_ERROR:
      const actionIndex = action.index
      return {
        ...state,
        errors: (state.errors || []).filter((_, index) => index !== actionIndex)
      }
    case actions.DISMISS_NOTIFY:
      return {
        ...state,
        notification: null
      }
    case actions.LEFT_NAV_TOGGLE:
      const open =
        typeof action.open === 'boolean' ? action.open : !state.leftNavOpen
      return {
        ...state,
        leftNavOpen: open
      }
    case actions.SHOW_ERROR:
      return {
        ...state,
        errors: (state.errors || []).concat(action.error)
      }
    case actions.SHOW_NOTIFICATION:
      return {
        ...state,
        notification: action.notification
      }
    case actions.INDICATE_LOADING:
      return incrementIndicator(action, state)
    case actions.DONE_LOADING:
      return decrementIndicator(action.key, state)
    case actions.SEARCH:
      return {
        ...state,
        searchQuery: action.query
      }
    default:
      return state
  }
}

export function isLoading (state: State): boolean {
  return !!state.loadingIndicators && state.loadingIndicators.length > 0
}

export function loadingMessage (state: State): ?string {
  const l = state.loadingIndicators && state.loadingIndicators[0]
  return l && l.message
}

export function loadingMessagesFor (key: string, state: State): string[] {
  const allIndicators = state.loadingIndicators || []
  const matching = allIndicators.filter(i => i.key === key)
  return matching.map(indicator => indicator.message)
}

function incrementIndicator (action: Indicator, state: State): State {
  const ls = state.loadingIndicators || []
  return {
    ...state,
    loadingIndicators: ls.concat(action)
  }
}

function decrementIndicator (key: string, state: State): State {
  const allIndicators = state.loadingIndicators || []
  const matching = allIndicators.filter(i => i.key === key)
  const others = allIndicators.filter(i => i.key !== key)
  return {
    ...state,
    loadingIndicators: others.concat(matching.slice(1))
  }
}
