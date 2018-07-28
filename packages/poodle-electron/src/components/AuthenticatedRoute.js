/* @flow */

import { sameEmail } from 'arfe/lib/models/uri'
import * as authActions from 'poodle-core/lib/actions/auth'
import * as selectors from 'poodle-core/lib/selectors'
import { type AccountMetadata } from 'poodle-service/lib/types'
import * as queryString from 'query-string'
import * as React from 'react'
import * as redux from 'react-redux'
import { type ContextRouter, Redirect, Route } from 'react-router-dom'
import { type State } from '../reducers'

type Props = {
  account: ?authActions.Account,
  children: (account: authActions.Account, router: ContextRouter) => React.Node,
  connected?: boolean,
  path?: string,
  exact?: boolean,
  strict?: boolean
}

export function AuthenticatedRoute ({ children, ...rest }: Props) {
  const { account, connected } = rest
  return (
    <Route
      {...rest}
      render={props => {
        if (!account) {
          const referrer = props.location.pathname + props.location.search
          return (
            <Redirect
              to={{
                pathname: '/login',
                search: queryString.stringify({ referrer })
              }}
            />
          )
        }
        if (!connected) {
          return (
            <div>
              <p>Logging in...</p>
            </div>
          )
        }
        return children(account, props)
      }}
    />
  )
}

function mapStateToProps (state: State): $Shape<Props> {
  return {
    account: state.auth.account,
    connected: selectors.loggedIn(state)
  }
}

export default redux.connect(mapStateToProps)(AuthenticatedRoute)
