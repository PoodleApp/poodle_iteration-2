/* @flow */

import { sameEmail } from 'arfe/lib/models/uri'
import * as authActions from 'poodle-core/lib/actions/auth'
import * as selectors from 'poodle-core/lib/selectors'
import { type AccountMetadata } from 'poodle-service'
import * as queryString from 'query-string'
import * as React from 'react'
import * as redux from 'react-redux'
import { Redirect, Route } from 'react-router-dom'

import type { ContextRouter } from 'react-router-dom'
import type { State } from '../reducers'

type Props = {
  account: ?authActions.Account,
  component?: React.ComponentType<*>,
  connected?: boolean,
  render?: (router: ContextRouter) => React.Element<any>,
  path?: string,
  exact?: boolean,
  strict?: boolean
}

export function AuthenticatedRoute ({ component, render, ...rest }: Props) {
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

        if (component) {
          return React.createElement(component, { ...props, account })
        }

        if (render) {
          return render({ ...props, account })
        }

        throw new Error(
          '`AuthenticatedRoute` requires either a `component` or a `render` prop'
        )
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
