/* @flow */

import * as kefir from 'kefir'
import Sync from 'poodle-service/lib/sync'

export type Slurp<T, E = Error> = {
  value?: T,
  error?: E,
  latest?: T | E,
  complete: boolean
}

export type ComponentKey = string
export type PropName = string

export type State = {
  componentStates?: { [key: ComponentKey]: ComponentState<any, any> },
  sync?: Sync
}

export type ComponentState<T, E = Error> = {
  [key: PropName]: Slurp<T, E>
}

export type Unsubscribe = () => void
