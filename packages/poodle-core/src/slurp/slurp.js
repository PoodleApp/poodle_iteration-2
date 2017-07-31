/* @flow */

import deepEqual from 'deep-equal'
import * as kefir from 'kefir'
import { connect } from 'react-redux'
import * as actions from './actions'
import * as effects from './effects'
import * as helpers from './helpers'
import * as selectors from './selectors'
import willUnmount from './willUnmount'

import type { Dispatch } from 'redux'
import type {
  Connector,
  ConnectOptions,
  MapDispatchToProps,
  MergeProps,
  Null
} from 'react-redux'
import type {
  ComponentKey,
  PropName,
  Slurp,
  State as SlurpState,
  Unsubscribe
} from './types'

// Map an `Effect` that produces an observable or a promise to a value or an
// error
type FromEffect = <T, E>(eff: effects.Effect<T, E>) => Slurp<T, E>

const getKey = (function () {
  let lastKey = 1
  return () => {
    lastKey += 1
    return `slurp-component_${lastKey}`
  }
})()

type MapSubscriptionsToProps<S, OP: Object, SP: Object> = (
  state: S,
  ownProps: OP
) => SP

declare function slurp<S, A, OP, SP>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, OP, SP>,
  mapDispatchToProps: Null,
  mergeProps: Null,
  options?: ConnectOptions
): Connector<
  OP,
  $Supertype<$ObjMap<SP, FromEffect> & { dispatch: Dispatch<A> } & OP>
>

declare function slurp<S, A, OP, SP, DP>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, OP, SP>,
  mapDispatchToProps: MapDispatchToProps<A, OP, DP>,
  mergeProps: Null,
  options?: ConnectOptions
): Connector<OP, $Supertype<$ObjMap<SP, FromEffect> & DP & OP>>

declare function slurp<S, A, OP, SP, DP, P>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, OP, SP>,
  mapDispatchToProps: Null,
  mergeProps: MergeProps<$ObjMap<SP, FromEffect>, DP, OP, P>,
  options?: ConnectOptions
): Connector<OP, P>

declare function slurp<S, A, OP, SP, DP, P>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, OP, SP>,
  mapDispatchToProps: MapDispatchToProps<A, OP, DP>,
  mergeProps: MergeProps<$ObjMap<SP, FromEffect>, DP, OP, P>,
  options?: ConnectOptions
): Connector<OP, P>

export function slurp<S, OP: Object, SP: Object> (
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, OP, SP>,
  mapDispatchToProps: *,
  mergeProps: *,
  extraOptions: * = {}
) {
  return component => {
    let onUnmount
    const unmountPromise = new Promise(resolve => (onUnmount = resolve))

    const withState = connect(null, mapDispatchToProps, mergeProps, {
      initMapStateToProps: initMapStateToProps.bind(
        null,
        mapSubscriptionsToProps,
        unmountPromise
      ),
      shouldHandleStateChanges: true,
      ...extraOptions
    })(component)

    return willUnmount((onUnmount: any))(withState)
  }
}

function initMapStateToProps<S: { slurp: SlurpState }, OP: Object, SP: Object> (
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, OP, SP>,
  willUnmount: Promise<void>,
  dispatch: Dispatch<*>,
  options: *
) {
  const componentKey = getKey()
  let sources: {
    [key: string]: {
      source: effects.Effect<any, any>,
      unsubscribe: Unsubscribe
    }
  } = {}

  function mapStateToProps (state: S, ownProps: OP): * {
    const props = mapSubscriptionsToProps(state, ownProps)
    const prevKeys = Object.keys(sources)

    // Unsubscribe to sources that no longer appear in slurpProps
    for (const key of prevKeys) {
      if (!props.hasOwnProperty(key)) {
        sources[key].unsubscribe()
        delete sources[key]
      }
    }

    // Create or recreate subscriptions for all sources unless the given Effect
    // matches a previously supplied Effect for the given key (using
    // shallowEqual comparison).
    for (const key of helpers.sourceKeys(props)) {
      const newSource = props[key]
      const existing = sources[key]
      if (!existing || !deepEqual(newSource, existing.source)) {
        if (existing) {
          existing.unsubscribe()
        }
        const unsubscribe = subscribe(dispatch, componentKey, key, newSource)
        sources[key] = { source: newSource, unsubscribe }
      }
    }

    return selectors.props(state.slurp, componentKey, props)
  }
  mapStateToProps.dependsOnOwnProps = true

  willUnmount.then(() => {
    unsubscribe(sources)
    sources = {}
  })

  return mapStateToProps
}

function subscribe<T, E> (
  dispatch: Dispatch<*>,
  componentKey: ComponentKey,
  propName: PropName,
  source: effects.Effect<T, E>
): Unsubscribe {
  if (source.type === 'slurp/observable') {
    return subscribeToObservable(
      dispatch,
      componentKey,
      propName,
      source.observableFn.apply(null, source.args)
    )
  } else if (source.type === 'slurp/promise') {
    return subscribeToPromise(
      dispatch,
      componentKey,
      propName,
      source.promiseFn.apply(null, source.args)
    )
  } else {
    throw new Error('Unknown slurp effect type!')
  }
}

function subscribeToObservable<T, E> (
  dispatch: Dispatch<*>,
  componentKey: ComponentKey,
  propName: PropName,
  source: kefir.Observable<T, E>
): Unsubscribe {
  const { unsubscribe } = source.observe({
    value (v: T) {
      dispatch(actions.onValue(componentKey, propName, v))
    },
    error (e: E) {
      dispatch(actions.onError(componentKey, propName, e))
    },
    end () {
      dispatch(actions.onComplete(componentKey, propName))
    }
  })
  return unsubscribe
}

function subscribeToPromise<T> (
  dispatch: Dispatch<*>,
  componentKey: ComponentKey,
  propName: PropName,
  source: Promise<T>
): Unsubscribe {
  source
    .then(v => {
      dispatch(actions.onValue(componentKey, propName, v))
      dispatch(actions.onComplete(componentKey, propName))
    })
    .catch(e => {
      dispatch(actions.onError(componentKey, propName, e))
      dispatch(actions.onComplete(componentKey, propName))
    })
  // Unsubscribing from a promise has no effect
  return noop
}

function unsubscribe (sources: {
  [key: string]: { source: *, unsubscribe: Unsubscribe }
}) {
  for (const key of Object.keys(sources)) {
    sources[key].unsubscribe()
  }
}

function noop () {}
