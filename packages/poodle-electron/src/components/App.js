/* @flow */

import React from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'
import Search from './channels/Search'
import AuthenticatedRoute from './AuthenticatedRoute'
import Conversation from './Conversation'
import Login from './Login'

type AppProps = {}

export default function App ({ }: AppProps) {
  return (
    <Switch>
      <AuthenticatedRoute path='/activity' component={Search} />
      <AuthenticatedRoute
        path='/conversations/:id'
        render={props =>
          <Conversation
            conversationId={decodeURIComponent(props.match.params.id)}
            {...props}
          />}
      />
      <Route path='/login' component={Login} />
      <Route render={props => <Redirect to='/activity' />} />
    </Switch>
  )
}
