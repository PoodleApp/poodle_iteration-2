/* @flow strict */

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
      <AuthenticatedRoute path='/activity'>
        {account => <Search account={account} />}
      </AuthenticatedRoute>
      <AuthenticatedRoute
        path='/compose/discussion'
        render={props => {
          const query = queryString.parse(props.location.search)
          return <ComposeConversation draftId={query.draftId} {...props} />
        }}
      />
      <AuthenticatedRoute path='/conversations/:id'>
        {(account, router) => {
          const id = router.match.params.id
          return id ? (
            <Conversation
              account={account}
              conversationId={decodeURIComponent(id)}
            />
          ) : (
            'Not Found'
          )
        }}
      </AuthenticatedRoute>
      <Route path='/login' component={Login} />
      <Route render={props => <Redirect to='/activity' />} />
    </Switch>
  )
}
