/* @flow */

import type { OauthCredentials } from 'poodle-service/lib/oauth/google'
import type { Account, Action } from '../actions/auth'

export type State = {
  account?: Account,
  authenticatedAs?: string
}

const initialState = {}

export default function reducer (
  state: State = initialState,
  action: Action
): State {
  switch (action.type) {
    case 'auth/setAccount':
      return {
        ...state,
        account: action.account
      }
    case 'auth/accessToken':
      return {
        ...state,
        authenticatedAs: action.email
      }
    default:
      return state
  }
}
