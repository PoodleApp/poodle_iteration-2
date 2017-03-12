/* @flow */

import React                       from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'
import ActivityStream              from './ActivityStream'
import AuthenticatedRoute          from './AuthenticatedRoute'
import Conversation                from './Conversation'
import Login                       from './Login'

type AppProps = {}

export default function App({}: AppProps) {
  return <Switch>
    <AuthenticatedRoute path="/activity" component={ActivityStream} />
    <AuthenticatedRoute path="/conversations/:id" render={({ match }) => (
      <Conversation conversationId={decodeURIComponent(match.params.id)} />
    )} />
    <Route path="/login" component={Login} />
    <Route render={props => <Redirect to="/activity" />} />
  </Switch>
}
