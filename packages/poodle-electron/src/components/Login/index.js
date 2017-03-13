/* @flow */

import * as authActions from 'poodle-core/lib/actions/auth'
import * as chromeState from 'poodle-core/lib/reducers/chrome'
import React            from 'react'
import * as redux       from 'react-redux'
import { Redirect }     from 'react-router-dom'

import type { Dispatch } from 'redux'
import type { State }    from '../../reducers'

type LoginProps = {
  account:              ?authActions.Account,
  dispatch:             Dispatch<any>,
  error:                ?Error,
  oauthLoadingMessages: string[],
  location:             Object,
  loggedIn:             boolean,
}

export function Login({ account, dispatch, loggedIn, oauthLoadingMessages }: LoginProps) {
  if (oauthLoadingMessages.length > 0 && !loggedIn) {
    return <div>
      {oauthLoadingMessages.map((msg, idx) => (
        <p key={idx}>{msg}</p>
      ))}
    </div>
  }
  else if (!account) {
    return <LoginForm dispatch={dispatch} />
  }
  else if (!loggedIn) {
    return <p>Waiting for authorization from your email provider...</p>
  }
  else {
    return <Redirect to="/activity" />
  }
}

type LoginFormProps = {
  dispatch: Dispatch<any>,
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

function mapStateToProps({ auth, chrome }: State): $Shape<LoginProps> {
  return {
    account:              auth.account,
    error:                chrome.error,
    oauthLoadingMessages: chromeState.loadingMessagesFor('authentication-flow', chrome),
    loggedIn:             !!auth.creds,
  }
}

export default redux.connect(mapStateToProps)(Login)
