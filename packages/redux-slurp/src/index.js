/* @flow */

import isObservable from 'is-observable'
import { createStore } from 'redux'
import { local } from 'redux-fractal'
import symbolObservable from 'symbol-observable'

import type { Component, Element } from 'react'
import type { Connector } from 'react-redux'
import type { Store } from 'redux'

/*
 * This is the interface described by https://github.com/tc39/proposal-observable
 * It provides interoperability between stream implementations, including Kefir,
 * RxJS, and zen-observable.
 */

export type Observer<-V, -E> = {
  start?: Function,
  +next?: (value: V) => any,
  +error?: (error: E) => any,
  complete?: () => any
}

export type ObservableImpl<+V, +E = *> = {
  subscribe(callbacks: Observer<V, E>): { unsubscribe: () => void }
}

interface StandardObservable<V, E> {
  [typeof symbolObservable]: () => ObservableImpl<V, E>
}

// TODO: This is a workaround for use until Kefir type definitions are updated
// with a `[typeof symbolObservable]` method. (The method is already implemented
// in Kefir, but it is not yet reflected in the type definitions.)
interface KefirObservable<V, E> {
  toESObservable(): ObservableImpl<V, E>
}

export type Observable<V, E> = StandardObservable<V, E> | KefirObservable<V, E>

type Unsubscribe = () => void

type Opts<OwnProps> = {
  key?: string | ((props: OwnProps, context: Object) => string)
}

// Map an Observable object property to an object containing a value or an error
type FromObservable = <V, E>(obs: Observable<V, E>) => SingleState<V, E>

export class SlurpError extends Error {
  mergedProps: Object
  constructor (msg: string, mergedProps: Object) {
    super(msg)
    this.mergedProps = mergedProps
  }
}

export default function slurp<OwnProps: Object, SlurpProps: Object> (
  mergeProps: (ownProps: OwnProps) => SlurpProps,
  options?: Opts<OwnProps>
): Connector<
  OwnProps,
  $Supertype<$ObjMap<SlurpProps, FromObservable> & OwnProps>
> {
  // Keep references to each source observable and the unsubscribe function for
  // its corresponding subscription
  let sources: {
    [key: string]: { source: Observable<any, any>, unsubscribe: Unsubscribe }
  } = {}
  let store
  let prevProps

  return local({
    key: (options && options.key) || getUniqueKey,

    createStore (props: OwnProps, existingState, context) {
      store = createStore(reducer)

      return {
        store,
        cleanup: () => {
          unsubscribe(sources)
          sources = {}
        }
      }
    },

    mapStateToProps (state: State, ownProps: OwnProps) {
      // We want to re-create subscriptions when props change, but not on every
      // state change
      if (ownProps === prevProps) {
        return slurpPropsFromState(state, [])
      }
      prevProps = ownProps

      const slurpProps = mergeProps(ownProps)
      const keys = sourceKeys(slurpProps)

      if (keys.length < 1) {
        throw new SlurpError(
          'No observable properties found in slurp configuration: ',
          slurpProps
        )
      }

      // Unsubscribe to sources that no longer appear in slurpProps
      for (const key of Object.keys(sources)) {
        if (!slurpProps.hasOwnProperty(key)) {
          sources[key].unsubscribe()
          delete sources[key]
        }
      }

      // Recreate subscriptions for all sources unless the source reference for
      // a key is identical to the previous source given for the same key. This
      // is also the point where subscriptions are created for the first time.
      setTimeout(() => {
        for (const key of keys) {
          const newSource = slurpProps[key]
          const existing = sources[key]
          if (!existing || newSource !== existing.source) {
            if (existing) {
              existing.unsubscribe()
            }
            const unsubscribe = subscribe(store, key, newSource)
            sources[key] = { source: newSource, unsubscribe }
          }
        }
      }, 0)

      return slurpPropsFromState(state, keys)
    },

    // Hide `dispatch` from connected components
    mapDispatchToProps (dispatch) {
      return {}
    }
  })
}

let keyCount = 0
function getUniqueKey (props: Object, context: Object): string {
  keyCount += 1
  return `slurp-${keyCount}`
}

/* state and reducer */

type State = { [key: string]: SingleState<any, any> }

type SingleState<Value, Error> = {
  value?: Value,
  error?: Error,
  latest?: Value | Error,
  complete: boolean
}

function getInitSingleState<Value, Error> (): SingleState<Value, Error> {
  return { complete: false }
}

function subscribe<V, E> (
  store: Store<State, Action>,
  key: string,
  source: Observable<V, E>
): Unsubscribe {
  store.dispatch(onInit(key))
  const { unsubscribe } = (source: any)[symbolObservable]().subscribe({
    next (value) {
      store.dispatch(onValue(key, value))
    },
    error (err) {
      store.dispatch(onError(key, err))
    },
    complete () {
      store.dispatch(onComplete(key))
    }
  })
  return unsubscribe
}

function unsubscribe (sources: {
  [key: string]: { source: *, unsubscribe: Unsubscribe }
}) {
  for (const key of Object.keys(sources)) {
    sources[key].unsubscribe()
  }
}

function sourceKeys (props: Object): string[] {
  return Object.keys(props).filter(key => isObservable(props[key]))
}

// This function serves two purposes: first if we ever put internal state in the
// local component state, then this function should return an object with
// internal data removed; second the function ensures that there is initial
// state in place for any recently-subscribed sources.
//
// TODO: We should remove stale keys from state in case an observable source is
// removed on props change
function slurpPropsFromState (
  state: State,
  sourceKeys: string[]
): { [key: string]: SingleState<any, any> } {
  const consumableState = { ...state }
  for (const key of sourceKeys) {
    if (!consumableState.hasOwnProperty(key)) {
      consumableState[key] = getInitSingleState()
    }
  }
  return consumableState
}

function reducer<Value, Error> (state: State = {}, action: Action): State {
  switch (action.type) {
    case 'redux-slurp/on-init':
      return updateSingle(action.key, state, getInitSingleState())
    case 'redux-slurp/on-value':
      return updateSingle(action.key, state, {
        value: action.value,
        latest: action.value
      })
    case 'redux-slurp/on-error':
      return updateSingle(action.key, state, {
        error: action.error,
        latest: action.error
      })
    case 'redux-slurp/on-complete':
      return updateSingle(action.key, state, { complete: true })
    default:
      return state
  }
}

function updateSingle<V, E> (
  key: string,
  state: State,
  changes: $Shape<SingleState<V, E>>
): State {
  const existing = state[key] || getInitSingleState()
  const updatedSingle = { ...existing, ...changes }
  return {
    ...state,
    [key]: updatedSingle
  }
}

/* actions */

type Action =
  | { key: string, type: 'redux-slurp/on-init' }
  | { key: string, type: 'redux-slurp/on-value', value: any }
  | { key: string, type: 'redux-slurp/on-error', error: any }
  | { key: string, type: 'redux-slurp/on-complete' }

function onInit (key: string): Action {
  return {
    key,
    type: 'redux-slurp/on-init'
  }
}

function onValue<Value> (key: string, value: Value): Action {
  return {
    key,
    type: 'redux-slurp/on-value',
    value
  }
}

function onError<Error> (key: string, error: Error): Action {
  return {
    key,
    type: 'redux-slurp/on-error',
    error
  }
}

function onComplete (key: string): Action {
  return { key, type: 'redux-slurp/on-complete' }
}
