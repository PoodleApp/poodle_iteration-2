/* @flow */

import { remote } from 'electron'
import { client_id, client_secret } from 'poodle-core/lib/constants'
import { type OauthCredentials } from 'poodle-service/lib/models/ImapAccount'
import * as google from 'poodle-service/lib/models/ImapAccount/google'

const scopes = [
  'email', // get user's email address
  'https://mail.google.com/', // IMAP and SMTP access
  'https://www.googleapis.com/auth/contacts.readonly' // contacts, read-only
]

export function getAccessToken (email: string): Promise<OauthCredentials> {
  return google.getAccessToken(openWindow, {
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
