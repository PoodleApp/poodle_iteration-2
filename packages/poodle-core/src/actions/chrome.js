/*
 * Actions that relate to updating bits of UI that are tangential to content
 *
 * @flow
 */

export type Action =
  | { type: 'dismissError' }
  | { type: 'dismissNotify' }
  | { type: 'leftNavToggle',    open: ?boolean }
  | { type: 'showError',        error: Error }
  | { type: 'showNotification', notification: string }
  | { type: 'indicateLoading',  key: string, message: string }
  | { type: 'doneLoading',      key: string }

export const dismissError: Action = Object.freeze({
  type: 'dismissError'
})

export const dismissNotify: Action = Object.freeze({
  type: 'dismissNotify'
})

export function leftNavToggle(open: ?boolean): Action {
  return {
    type: 'leftNavToggle',
    open,
  }
}

export function showError(error: Error): Action {
  return {
    type: 'showError',
    error,
  }
}

export function showNotification(notification: string): Action {
  return {
    type: 'showNotification',
    notification,
  }
}

export function indicateLoading(key: string, message: string): Action {
  return {
    type: 'indicateLoading',
    message,
    key,
  }
}

export function doneLoading(key: string): Action {
  return {
    type: 'doneLoading',
    key,
  }
}
