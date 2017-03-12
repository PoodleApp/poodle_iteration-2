/* @flow */

import * as authActions    from 'poodle-core/lib/actions/auth'
import React               from 'react'
import * as redux          from 'react-redux'
import { Redirect, Route } from 'react-router-dom'

import type { ContextRouter } from 'react-router-dom'
import type { State }         from '../reducers'

type Props = {
  account:    ?authActions.Account,
  component?: ReactClass<*>,
  render?:    (router: ContextRouter) => React.Element<*>,
  children?:  (router: ContextRouter) => React.Element<*>,
  path?:      string,
  exact?:     bool,
  strict?:    bool,
}

export function AuthenticatedRoute({ children, component, render, ...rest }: Props) {
  const account = rest.account

  return <Route {...rest} render={props => {
    if (!account) {
      return <Redirect to="/login" />
    }

    if (component) {
      return React.createElement(component, rest)
    }

    if (render) {
      return render(props)
    }

    throw new Error('`AuthenticatedRoute` requires either a `component` or a `render` prop')
  }} />
}

function mapStateToProps({ auth }: State): $Shape<Props> {
  return {
    account: auth.account,
  }
}

export default redux.connect(mapStateToProps)(AuthenticatedRoute)
