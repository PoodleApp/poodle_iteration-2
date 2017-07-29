/* @flow */

import * as kefir from 'kefir'
import Sync from 'poodle-service/lib/sync'
import { connect } from 'react-redux'
import { whenMapStateToPropsIsFunction } from 'react-redux/lib/connect/mapStateToProps'
import shallowEqual from 'react-redux/lib/utils/shallowEqual'
import * as actions from './actions'
import * as helpers from './helpers'
import * as selectors from './selectors'

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

// Map an Observable object property to an object containing a value or an error
type FromObservable = <V, E>(obs: kefir.Observable<V, E>) => Slurp<V, E>

const getKey = (function () {
  let lastKey = 1
  return () => {
    lastKey += 1
    return `slurp-component_${lastKey}`
  }
})()

type MapSubscriptionsToProps<OP: Object, SP: Object> = (
  ownProps: OP,
  sync: Sync
) => SP

declare function slurp<S, A, OP, SP>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<OP, SP>,
  mapDispatchToProps: Null,
  mergeProps: Null,
  options?: ConnectOptions
): Connector<
  OP,
  $Supertype<$ObjMap<SP, FromObservable> & { dispatch: Dispatch<A> } & OP>
>

declare function slurp<S, A, OP, SP, DP>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<OP, SP>,
  mapDispatchToProps: MapDispatchToProps<A, OP, DP>,
  mergeProps: Null,
  options?: ConnectOptions
): Connector<OP, $Supertype<$ObjMap<SP, FromObservable> & DP & OP>>

declare function slurp<S, A, OP, SP, DP, P>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<OP, SP>,
  mapDispatchToProps: Null,
  mergeProps: MergeProps<$ObjMap<SP, FromObservable>, DP, OP, P>,
  options?: ConnectOptions
): Connector<OP, P>

declare function slurp<S, A, OP, SP, DP, P>(
  mapSubscriptionsToProps: MapSubscriptionsToProps<OP, SP>,
  mapDispatchToProps: MapDispatchToProps<A, OP, DP>,
  mergeProps: MergeProps<$ObjMap<SP, FromObservable>, DP, OP, P>,
  options?: ConnectOptions
): Connector<OP, P>

export function slurp<
  OwnProps: Object,
  SlurpProps: Object,
  State: { slurp: SlurpState }
> (
  mapSubscriptionsToProps: (ownProps: OwnProps, sync: Sync) => SlurpProps,
  mapDispatchToProps: *,
  mergeProps: *,
  extraOptions: * = {}
) {
  const componentKey = getKey()
  let sources: {
    [key: string]: {
      source: kefir.Observable<any, any>,
      unsubscribe: Unsubscribe
    }
  } = {}
  let lastOwnProps

  function initMapStateToProps (dispatch: Dispatch<*>, options: *) {
    return whenMapStateToPropsIsFunction(function mapStateToProps (
      state: State,
      ownProps: OwnProps
    ): * {
      if (shallowEqual(ownProps, lastOwnProps)) {
        // Do not re-run `mapSubscriptionsToProps` on state changes - only on
        // props changes
        return selectors.props(state.slurp, componentKey, lastOwnProps)
      }
      lastOwnProps = ownProps

      const sync = state.slurp.sync
      if (!sync) {
        throw new Error('Could not find `sync` in redux state')
      }

      const props = mapSubscriptionsToProps(ownProps, sync)
      const keys = helpers.sourceKeys(props)
      const prevKeys = Object.keys(sources)

      // Unsubscribe to sources that no longer appear in slurpProps
      for (const key of prevKeys) {
        if (!props.hasOwnProperty(key)) {
          sources[key].unsubscribe()
          delete sources[key]
        }
      }

      // Create or recreate subscriptions for all sources unless the source
      // reference for a key is identical to the previous source given for the same
      // key.
      for (const key of keys) {
        const newSource = props[key]
        const existing = sources[key]
        if (!existing || newSource !== existing.source) {
          if (existing) {
            existing.unsubscribe()
          }
          const unsubscribe = subscribe(dispatch, componentKey, key, newSource)
          sources[key] = { source: newSource, unsubscribe }
        }
      }

      return selectors.props(state.slurp, componentKey, props)
    })
  }

  return connect(null, mapDispatchToProps, mergeProps, {
    initMapStateToProps,
    ...extraOptions
  })
}

function subscribe<V, E> (
  dispatch: Dispatch<*>,
  componentKey: ComponentKey,
  propName: PropName,
  source: kefir.Observable<V, E>
): Unsubscribe {
  const { unsubscribe } = source.observe({
    value (v: V) {
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
