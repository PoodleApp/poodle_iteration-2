/* @flow */

import { remote } from 'electron'
import { client_id, client_secret } from 'poodle-core/lib/constants'
import * as oauth from 'poodle-service/lib/oauth/google'

export type OauthCredentials = oauth.OauthCredentials

const scopes = [
  'email', // get user's email address
  'https://mail.google.com/', // IMAP and SMTP access
  'https://www.googleapis.com/auth/contacts.readonly' // contacts, read-only
]

export function getAccessToken (email: string): Promise<oauth.OauthCredentials> {
  return oauth.getAccessToken(openWindow, {
    scopes,
    client_id,
    client_secret,
    login_hint: email
  })
}

function openWindow () {
  return new (remote.BrowserWindow: any)({
    title: 'Authenticate with your email provider',
    useContentSize: true
  })
}
