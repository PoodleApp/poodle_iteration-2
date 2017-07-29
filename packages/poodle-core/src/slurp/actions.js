/* @flow */

import * as kefir from 'kefir'
import Sync from 'poodle-service/lib/sync'

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
  | {
      componentKey: ComponentKey, // key here just for consistency with other actions
      propName: PropName,
      type: 'slurp/set-sync',
      sync: Sync
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

export function setSync (sync: Sync): Action {
  return {
    componentKey: '',
    propName: '',
    type: 'slurp/set-sync',
    sync
  }
}
