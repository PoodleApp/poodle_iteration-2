/* @flow */

import * as authActions from 'poodle-core/lib/actions/auth'
import Sync from 'poodle-service/lib/sync'
import * as queryString from 'query-string'
import React from 'react'
import * as redux from 'react-redux'
import { Redirect, Route } from 'react-router-dom'

import type { ContextRouter } from 'react-router-dom'
import type { State } from '../reducers'

type Props = {
  account: ?authActions.Account,
  component?: ReactClass<*>,
  render?: (router: ContextRouter) => React.Element<*>,
  sync: ?Sync,
  children?: (router: ContextRouter) => React.Element<*>,
  path?: string,
  exact?: boolean,
  strict?: boolean
}

export function AuthenticatedRoute ({
  children,
  component,
  render,
  ...rest
}: Props) {
  const { account, sync } = rest

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

        if (!sync) {
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

function mapStateToProps ({ auth }: State): $Shape<Props> {
  return {
    account: auth.account,
    sync: auth.sync
  }
}

export default redux.connect(mapStateToProps)(AuthenticatedRoute)
