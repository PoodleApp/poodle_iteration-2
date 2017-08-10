/* @flow */

import * as kefir from 'kefir'

import type { ComponentKey, PropName } from './types'

export const ON_VALUE: 'slurp/on-value' = 'slurp/on-value'
export const ON_ERROR: 'slurp/on-error' = 'slurp/on-error'
export const ON_COMPLETE: 'slurp/on-complete' = 'slurp/on-complete'
export const CLEANUP: 'slurp/cleanup' = 'slurp/cleanup'

export type Action =
  | {
      componentKey: ComponentKey,
      propName: PropName,
      type: typeof ON_VALUE,
      value: any
    }
  | {
      componentKey: ComponentKey,
      propName: PropName,
      type: typeof ON_ERROR,
      error: any
    }
  | {
      componentKey: ComponentKey,
      propName: PropName,
      type: typeof ON_COMPLETE
    }
  | {
      componentKey: ComponentKey,
      propName: PropName, // Included for symmetry with other actions
      type: typeof CLEANUP
    }

export function onValue<Value> (
  componentKey: ComponentKey,
  propName: PropName,
  value: Value
): Action {
  return {
    componentKey,
    propName,
    type: ON_VALUE,
    value
  }
}

export function onError<Error> (
  componentKey: ComponentKey,
  propName: PropName,
  error: Error
): Action {
  return {
    componentKey,
    propName,
    type: ON_ERROR,
    error
  }
}

export function onComplete (
  componentKey: ComponentKey,
  propName: PropName
): Action {
  return { componentKey, propName, type: ON_COMPLETE }
}

export function cleanup (componentKey: ComponentKey): Action {
  return { componentKey, propName: '', type: CLEANUP }
}
