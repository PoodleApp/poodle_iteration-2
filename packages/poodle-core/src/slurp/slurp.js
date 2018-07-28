/* @flow */

import deepEqual from 'deep-equal'
import * as kefir from 'kefir'
import nextTick from 'process-nextick-args'
import { type ComponentType, type ElementConfig } from 'react'
import { connect } from 'react-redux'
import { type Dispatch } from 'redux'
import * as chrome from '../actions/chrome'
import * as actions from './actions'
import * as effects from './effects'
import * as helpers from './helpers'
import * as selectors from './selectors'
import lifecycle from './lifecycle'

import type {
  ComponentKey,
  PropName,
  Slurp,
  State as SlurpState,
  Unsubscribe
} from './types'

// Map an `Effect` that produces an observable or a promise to a value or an
// error
type FromEffect = (<T, E>(eff: effects.Effect<T, E>) => Slurp<T, E>) &
  (<T>(other: T) => T)

const getKey = (function () {
  let lastKey = 1
  return () => {
    lastKey += 1
    return `slurp-component_${lastKey}`
  }
})()

type MapSubscriptionsToProps<S, SP: Object, RSP: Object> = (
  state: S,
  ownProps: SP
) => RSP

type MapDispatchToProps<A, OP: Object, RDP: Object> = (
  dispatch: Dispatch<A>,
  ownProps: OP
) => RDP

type MergeProps<SP: Object, DP: Object, MP: Object, RMP: Object> = (
  stateProps: SP,
  dispatchProps: DP,
  ownProps: MP
) => RMP

type ConnectOptions<S: Object, OP: Object, RSP: Object, RMP: Object> = {|
  pure?: boolean,
  withRef?: boolean,
  areStatesEqual?: (next: S, prev: S) => boolean,
  areOwnPropsEqual?: (next: OP, prev: OP) => boolean,
  areStatePropsEqual?: (next: RSP, prev: RSP) => boolean,
  areMergedPropsEqual?: (next: RMP, prev: RMP) => boolean,
  storeKey?: string
|}

type OmitDispatch<Component> = $Diff<Component, { dispatch: Dispatch<*> }>

// export function Slurp<
//   State: { slurp: SlurpState },
//   OwnProps: Object
// >(props: {
//   children(state: State): React.Node,
//   mapDispatchToProps
// }) {
//   return props.children()
// }


declare function slurp<
  Com: ComponentType<*>,
  S: { slurp: SlurpState },
  DP: Object,
  RSP: Object,
  CP: $Diff<OmitDispatch<ElementConfig<Com>>, $ObjMap<RSP, FromEffect>>
>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, DP, RSP>,
  mapDispatchToProps?: null
): (component: Com) => ComponentType<CP & DP>

declare function slurp<
  A,
  S: { slurp: SlurpState },
  DP: Object,
  SP: Object,
  RSP: Object,
  RDP: Object
>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, SP, RSP>,
  mapDispatchToProps: MapDispatchToProps<A, DP, RDP>
): <Com: ComponentType<*>>(
  component: Com
) => ComponentType<$Diff<$Diff<ElementConfig<Com>, $ObjMap<RSP, FromEffect>>, RDP> & SP & DP>

declare function slurp<
  Com: ComponentType<*>,
  A,
  S: { slurp: SlurpState },
  DP: Object,
  SP: Object,
  RSP: Object,
  RDP: Object,
  MP: Object,
  RMP: Object,
  CP: $Diff<ElementConfig<Com>, RMP>
>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, SP, RSP>,
  mapDispatchToProps: ?MapDispatchToProps<A, DP, RDP>,
  mergeProps: MergeProps<RSP, RDP, MP, RMP>
): (component: Com) => ComponentType<CP & SP & DP & MP>

declare function slurp<
  Com: ComponentType<*>,
  A,
  S: { slurp: SlurpState },
  DP: Object,
  SP: Object,
  RSP: Object,
  RDP: Object,
  MP: Object,
  RMP: Object
>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, SP, RSP>,
  mapDispatchToProps: ?MapDispatchToProps<A, DP, RDP>,
  mergeProps: ?MergeProps<RSP, RDP, MP, RMP>,
  options?: ConnectOptions<S, SP & DP & MP, RSP, RMP>
): (
  component: Com
) => ComponentType<$Diff<ElementConfig<Com>, RMP> & SP & DP & MP>

export function slurp<S: { slurp: SlurpState }, SP: Object, RSP: Object> (
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, SP, RSP>,
  mapDispatchToProps: *,
  mergeProps: *,
  extraOptions: * = {}
) {
  return component => {
    return connect(null, mapDispatchToProps, mergeProps, {
      initMapStateToProps: initMapStateToProps.bind(
        null,
        mapSubscriptionsToProps
      ),
      shouldHandleStateChanges: true,
      ...extraOptions
    })(lifecycle(component))
  }
}

function initMapStateToProps<S: { slurp: SlurpState }, OP: Object, SP: Object> (
  mapSubscriptionsToProps: MapSubscriptionsToProps<S, OP, SP>,
  dispatch: Dispatch<*>,
  options: *
) {
  const componentKey = getKey()
  const delayedDispatch = delayed(dispatch)
  let sources: {
    [key: string]: {
      source: effects.Effect<any, any>,
      unsubscribe: Unsubscribe
    }
  } = {}

  function onWillUnmount () {
    unsubscribe(sources)
    sources = {}
    dispatch(actions.cleanup(componentKey))
  }

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
        // Dispatch on next tick to avoid a tight loop in cases where, e.g.,
        // a subscription ends synchronously.
        const unsubscribe = subscribe(
          delayedDispatch,
          componentKey,
          key,
          newSource
        )
        sources[key] = { source: newSource, unsubscribe }
      }
    }

    function onReload (key: PropName): () => void {
      return () => {
        if (sources.hasOwnProperty(key)) {
          const source = sources[key]
          source.unsubscribe()
          const unsubscribe = subscribe(
            dispatch,
            componentKey,
            key,
            source.source
          )
          sources[key] = { source: source.source, unsubscribe }
        }
      }
    }

    return {
      ...selectors.props(state.slurp, componentKey, props, onReload),
      onWillUnmount
    }
  }
  mapStateToProps.dependsOnOwnProps = true

  return mapStateToProps
}

function subscribe<T, E> (
  dispatch: Dispatch<*>,
  componentKey: ComponentKey,
  propName: PropName,
  source: effects.Effect<T, E>
): Unsubscribe {
  if (source.type === effects.SUBSCRIBE) {
    const obs = source.observableFn.apply(null, source.args)
    if (typeof obs.observe === 'function') {
      return subscribeToObservable(dispatch, componentKey, propName, (obs: any))
    }
    if (typeof obs.then === 'function') {
      return subscribeToPromise(dispatch, componentKey, propName, (obs: any))
    } else {
      throw new Error(
        'First argument of `subscribe` effect must return an observable or a promise'
      )
    }
  } else {
    throw new Error('Unknown slurp effect type!')
  }
}

function subscribeToObservable<T, E, Obs: kefir.Observable<T, E>> (
  dispatch: Dispatch<*>,
  componentKey: ComponentKey,
  propName: PropName,
  source: Obs
): Unsubscribe {
  const { unsubscribe } = source.observe({
    value (v: T) {
      dispatch(actions.onValue(componentKey, propName, v))
    },
    error (e: E) {
      dispatch(actions.onError(componentKey, propName, e))
      dispatch(chrome.showError((e: any))) // TODO: this is a hack
      console.error(e)
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
      dispatch(chrome.showError((e: any))) // TODO: this is a hack
      console.error(e)
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

function delayed (fn: Function): Function {
  return (...args) => {
    nextTick(() => fn(...args))
  }
}

function noop () {}
