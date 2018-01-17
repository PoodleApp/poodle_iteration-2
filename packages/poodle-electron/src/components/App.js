/* @flow */

import * as queryString from 'query-string'
import React from 'react'
import { Redirect, Route, Switch } from 'react-router-dom'
import Search from './channels/Search'
import AuthenticatedRoute from './AuthenticatedRoute'
import ComposeConversation from './ComposeConversation'
import Conversation from './Conversation'
import Login from './Login'

type AppProps = {}

export default function App ({ }: AppProps) {
  return (
    <Switch>
      <AuthenticatedRoute path='/activity' component={Search} />
      <AuthenticatedRoute
        path='/compose/discussion'
        render={props => {
          const query = queryString.parse(props.location.search)
          return <ComposeConversation draftId={query.draftId} {...props} />
        }}
      />
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
