/*
 * Actions that relate to updating bits of UI that are tangential to content
 *
 * @flow
 */

import { type URI } from 'arfe/lib/models/uri'

export const START_EDITING: 'chrome/startEditing' = 'chrome/startEditing'
export const STOP_EDITING: 'chrome/stopEditing' = 'chrome/stopEditing'
export const DISMISS_ERROR: 'chrome/dismissError' = 'chrome/dismissError'
export const DISMISS_NOTIFY: 'chrome/dismissNotify' = 'chrome/dismissNotify'
export const LEFT_NAV_TOGGLE: 'chrome/leftNavToggle' = 'chrome/leftNavToggle'
export const SHOW_ERROR: 'chrome/showError' = 'chrome/showError'
export const SHOW_NOTIFICATION: 'chrome/showNotification' =
  'chrome/showNotification'
export const INDICATE_LOADING: 'chrome/indicateLoading' =
  'chrome/indicateLoading'
export const DONE_LOADING: 'chrome/doneLoading' = 'chrome/doneLoading'

export type Action =
  | { type: typeof START_EDITING, activityId: URI }
  | { type: typeof STOP_EDITING, activityId: URI }
  | { type: typeof DISMISS_ERROR, index: number }
  | { type: typeof DISMISS_NOTIFY }
  | { type: typeof LEFT_NAV_TOGGLE, open: ?boolean }
  | { type: typeof SHOW_ERROR, error: Error }
  | { type: typeof SHOW_NOTIFICATION, notification: string }
  | { type: typeof INDICATE_LOADING, key: string, message: string }
  | { type: typeof DONE_LOADING, key: string }

export function startEditing (activityId: URI): Action {
  return { type: START_EDITING, activityId }
}

export function stopEditing (activityId: URI): Action {
  return { type: STOP_EDITING, activityId }
}

export function dismissError (index: number): Action {
  return { type: DISMISS_ERROR, index }
}

export const dismissNotify: Action = Object.freeze({
  type: DISMISS_NOTIFY
})

export function leftNavToggle (open: ?boolean): Action {
  return {
    type: LEFT_NAV_TOGGLE,
    open
  }
}

export function showError (error: Error): Action {
  return {
    type: SHOW_ERROR,
    error
  }
}

export function showNotification (notification: string): Action {
  return {
    type: SHOW_NOTIFICATION,
    notification
  }
}

export function indicateLoading (key: string, message: string): Action {
  return {
    type: INDICATE_LOADING,
    message,
    key
  }
}

export function doneLoading (key: string): Action {
  return {
    type: DONE_LOADING,
    key
  }
}
