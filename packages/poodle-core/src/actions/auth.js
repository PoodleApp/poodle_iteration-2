/* @flow */

import type { OauthCredentials } from 'poodle-service/lib/oauth/google'

export type Action =
  | { type: 'auth/accessToken', email: string, creds: OauthCredentials }
  | { type: 'auth/setAccount', account: Account }

export type Account = {
  email: string
}

export function accessToken (email: string, creds: OauthCredentials): Action {
  return {
    type: 'auth/accessToken',
    email,
    creds
  }
}

export function setAccount (account: Account): Action {
  return {
    type: 'auth/setAccount',
    account
  }
}
