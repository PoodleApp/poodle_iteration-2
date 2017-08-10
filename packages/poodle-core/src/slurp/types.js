/* @flow */

import * as kefir from 'kefir'

export type Slurp<T, E = Error> = {
  value?: T,
  error?: E,
  latest?: T | E,
  complete: boolean,
  reload: () => void
}

export type ComponentKey = string
export type PropName = string

export type State = {
  componentStates?: { [key: ComponentKey]: ComponentState<any, any> }
}

export type ComponentState<T, E = Error> = {
  [key: PropName]: Slurp<T, E>
}

export type Unsubscribe = () => void
