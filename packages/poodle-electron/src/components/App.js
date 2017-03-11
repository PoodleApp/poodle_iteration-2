/* @flow */

import * as authActions            from 'poodle-core/lib/actions/auth'
import * as chromeActions          from 'poodle-core/lib/actions/chrome'
import * as chromeState            from 'poodle-core/lib/reducers/chrome'
import React                       from 'react'
import * as redux                  from 'react-redux'
import { Redirect, Route, Switch } from 'react-router-dom'
import ActivityStream              from './ActivityStream'
import Conversation                from './Conversation'

import type { State } from '../reducers'

type AppProps = {
  account:        ?authActions.Account,
  dispatch:       Function,
  error:          ?Error,
  loadingMessage: ?string,
  loggedIn:       boolean,
}

export function App(props: AppProps) {
  if (!props.loggedIn) {
    return <LoginForm dispatch={props.dispatch} />
  }
  else if (!props.account) {
    return <p>Waiting for authorization from your email provider...</p>
  }

  return <Switch>
    <Route path="/activity"                 component={ActivityStream} />
    <Route path="/conversations/:channelId" component={Conversation}   />
    <Route render={() => {
      return <Redirect to="/activity" />
    }} />
  </Switch>
}

type LoginFormProps = {
  dispatch: Function,
}

function LoginForm(props: LoginFormProps) {
  let emailInput: ?HTMLInputElement
  return (
    <div>
      <p>Please log in to continue</p>
      <form onSubmit={event => onLogin(props, emailInput, event)}>
        <label>
          Your email address:
          <input type="email" ref={input => { emailInput = input }} />
        </label>
        <input type="submit" value="Log In" />
      </form>
    </div>
  )
}

function onLogin({ dispatch }: LoginFormProps, emailInput: ?HTMLInputElement, event: Event) {
  event.preventDefault()
  if (!emailInput) {
    throw new Error('email input could not be found')
  }
  const email = emailInput.value
  if (email) {
    dispatch(authActions.setAccount({ email }))
  }
}

function mapStateToProps({ auth, chrome }: State): $Shape<AppProps> {
  return {
    account:        auth.account,
    error:          chrome.error,
    loadingMessage: chromeState.loadingMessage(chrome),
    loggedIn:       !!auth.creds,
  }
}

export default redux.connect(mapStateToProps)(App)
