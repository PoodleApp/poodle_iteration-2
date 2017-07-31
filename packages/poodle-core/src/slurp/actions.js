/* @flow */

import * as kefir from 'kefir'

import type { ComponentKey, PropName } from './types'

export type Action =
  | {
      componentKey: ComponentKey,
      propName: PropName,
      type: 'slurp/on-value',
      value: any
    }
  | {
      componentKey: ComponentKey,
      propName: PropName,
      type: 'slurp/on-error',
      error: any
    }
  | {
      componentKey: ComponentKey,
      propName: PropName,
      type: 'slurp/on-complete'
    }

export function onValue<Value> (
  componentKey: ComponentKey,
  propName: PropName,
  value: Value
): Action {
  return {
    componentKey,
    propName,
    type: 'slurp/on-value',
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
    type: 'slurp/on-error',
    error
  }
}

export function onComplete (
  componentKey: ComponentKey,
  propName: PropName
): Action {
  return { componentKey, propName, type: 'slurp/on-complete' }
}
