/* @flow */

import Dialog from 'material-ui/Dialog'
import RaisedButton from 'material-ui/RaisedButton'
import TextField from 'material-ui/TextField'
import * as authActions from 'poodle-core/lib/actions/auth'
import * as chromeActions from 'poodle-core/lib/actions/chrome'
import * as chromeState from 'poodle-core/lib/reducers/chrome'
import PropTypes from 'prop-types'
import * as queryString from 'query-string'
import React from 'react'
import * as redux from 'react-redux'
import { Redirect } from 'react-router-dom'
import Errors from '../Errors'

import type { Dispatch } from 'redux'
import type { State } from '../../reducers'

function getStyles (palette: Object) {
  return {
    root: {
      display: 'flex',
      flex: 1,
      flexDirection: 'column',
      fontSize: 'x-large',
      lineHeight: '1.5',
      minHeight: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    },
    emailInput: {
      textAlign: 'center'
    },
    emailInputContainer: {
      fontSize: '3em',
      height: '1.8em',
      textAlign: 'center',
      width: '100%'
    },
    emailInputHint: {
      width: '100%'
    },
    heading: {
      fontSize: '4em'
    },
    labelText: {
      fontSize: '2em',
      margine: '1em 0'
    },
    loginButton: {
      marginTop: '5em',
      transform: 'scale(3)'
    },
    logo: {
      color: palette.primary2Color
    }
  }
}

type LoginProps = {
  account: ?authActions.Account,
  dispatch: Dispatch<any>,
  errors: ?(Error[]),
  oauthLoadingMessages: string[],
  onDismissError: typeof chromeActions.dismissError,
  location: Object,
  loggedIn: boolean
}

export function Login ({
  account,
  dispatch,
  location,
  loggedIn,
  oauthLoadingMessages,
  ...props
}: LoginProps) {
  const messages = oauthLoadingMessages.map((msg, idx) =>
    <p key={idx}>
      {msg}
    </p>
  )

  if (account && loggedIn) {
    const referrer = queryString.parse(location.search).referrer
    return (
      <Redirect to={referrer || '/activity'} />
    )
  }

  return (
    <div>
      <LoginForm dispatch={dispatch} />
      <Dialog modal={true} open={messages.length > 0}>
        {messages}
      </Dialog>
      <Errors errors={props.errors} onDismiss={props.onDismissError} />
    </div>
  )
}

type LoginFormProps = {
  dispatch: Dispatch<any>
}

function LoginForm (props: LoginFormProps, context) {
  let emailInput: ?Object

  function onSubmit (event) {
    onLogin(props, emailInput, event)
  }

  const { palette } = context.muiTheme.baseTheme
  const styles = getStyles(palette)

  return (
    <form style={styles.root} onSubmit={onSubmit}>
      <h1 style={styles.heading}>
        Welcome to <span style={styles.logo}>Poodle</span>
      </h1>
      <label>
        <p style={styles.labelText}>
          Log in with your email address<br />to continue:
        </p>
        <TextField
          id='login-email'
          type='email'
          placeholder='you@the.internet'
          hintStyle={styles.emailInputHint}
          inputStyle={styles.emailInput}
          style={styles.emailInputContainer}
          ref={input => {
            emailInput = input
          }}
        />
      </label>
      <RaisedButton type='submit' label='Log In' style={styles.loginButton} />
    </form>
  )
}

LoginForm.contextTypes = {
  muiTheme: PropTypes.object.isRequired
}

function onLogin (
  { dispatch }: LoginFormProps,
  emailInput: ?Object,
  event: Event
) {
  event.preventDefault()
  if (!emailInput || !emailInput.getValue) {
    throw new Error('email input could not be found')
  }
  const email = emailInput.getValue()
  if (email) {
    dispatch(authActions.setAccount({ email }))
  }
}

function mapStateToProps ({ auth, chrome }: State): $Shape<LoginProps> {
  return {
    account: auth.account,
    errors: chrome.errors,
    oauthLoadingMessages: chromeState.loadingMessagesFor(
      'authentication-flow',
      chrome
    ),
    loggedIn: !!auth.authenticatedAs
  }
}

function mapDispatchToProps (dispatch: Dispatch<*>) {
  return {
    onDismissError(...args) { dispatch(chromeActions.dismissError(...args)) }
  }
}

export default redux.connect(mapStateToProps, mapDispatchToProps)(Login)
