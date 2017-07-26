/* @flow */

import Sync from 'poodle-service/lib/sync'
import * as redux from 'react-redux'
import slurp from 'redux-slurp'
import * as auth from '../actions/auth'

import type { Connector } from 'react-redux'
import type { Observable, Slurp } from 'redux-slurp'
import type { State as AuthState } from '../reducers/auth'

// Map an Observable object property to an object containing a value or an error
type FromObservable = <V, E>(obs: Observable<V, E>) => Slurp<V, E>

type AuthProps = {
  account: auth.Account,
  sync: Sync
}

export default function poodleSlurp<OwnProps: Object, SlurpProps: Object> (
  mergeProps: (
    ownProps: OwnProps,
    sync: Sync,
    account: auth.Account
  ) => SlurpProps
): Connector<
  OwnProps,
  $Supertype<$ObjMap<SlurpProps, FromObservable> & OwnProps & AuthProps>
> {
  return (component => {
    const withState = redux.connect(
      <State: { auth: AuthState }>({ auth }: State) => {
        return { account: auth.account, sync: auth.sync }
      }
    )(component)

    const withData = slurp((ownProps: OwnProps) =>
      mergeProps(ownProps, ownProps.sync, ownProps.account)
    )(withState)

    return withData
  }: any)
}
