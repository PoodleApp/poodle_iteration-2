/* @flow */

import { BrowserWindow }            from 'electron'
import * as oauth                   from 'graphql-imap/lib/oauth/google'
import { client_id, client_secret } from 'poodle-core/lib/constants'

export type OauthCredentials = oauth.OauthCredentials

const scopes = [
  'email',  // get user's email address
  'https://mail.google.com/',  // IMAP and SMTP access
  'https://www.googleapis.com/auth/contacts.readonly',  // contacts, read-only
]

export function getAccessToken({ email }: { email: string }): Promise<oauth.OauthCredentials> {
  return oauth.getAccessToken(openWindow, {
    scopes,
    client_id,
    client_secret,
    login_hint: email,
  })
}

function openWindow() {
  return new (BrowserWindow: any)({
    'use-content-size': true,
  })
}
