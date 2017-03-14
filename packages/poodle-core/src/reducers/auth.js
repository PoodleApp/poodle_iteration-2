/* @flow */

import type { OauthCredentials } from 'poodle-service/lib/oauth/google'
import type { Account, Action }  from '../actions/auth'

export type State = {
  account?: Account,
  creds?:   OauthCredentials,  // update state when creds appear to trigger re-render
}

const initialState = {}

export default function reducer(state: State = initialState, action: Action): State {
  switch (action.type) {
    case 'auth/accessToken':
      return {
        ...state,
        creds: action.creds
      }
    case 'auth/setAccount':
      return {
        ...state,
        account: action.account,
      }
    default:
      return state
  }
}
