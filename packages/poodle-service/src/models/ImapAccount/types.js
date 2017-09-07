/* @flow */

import type Connection from 'imap'

export type ConnectionFactory = () => Promise<Connection>

// TODO: accept other account types
export type ImapAccount = GoogleAccount

export const GOOGLE = 'google'

export type GoogleAccount = {
  type: typeof GOOGLE,
  email: string,
  client_id: string,
  client_secret: string,
  credentials: OauthCredentials
}

export type OauthCredentials = {
  access_token:  string,
  token_type:    string,  // "Bearer"
  expires_in:    number,  // seconds
  id_token:      string,
  refresh_token: string,
}
