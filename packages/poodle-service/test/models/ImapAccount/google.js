/* @flow */

import * as fs         from 'fs'
import { type OauthCredentials } from '../../../src/models/ImapAccount'
import * as google     from '../../../src/models/ImapAccount/google'
import IndirectBrowser from '../../IndirectBrowser'

function getClientIdAndSecret(): { client_id: string, client_secret: string } {
  const client_id = process.env.CLIENT_ID
  const client_secret = process.env.CLIENT_SECRET
  if (!client_id || !client_secret) {
    throw 'Please set CLIENT_ID and CLIENT_SECRET'
  }
  return { client_id, client_secret }
}

function getEmailAddress(): string {
  const email = process.env.EMAIL
  if (!email) {
    throw 'Please set EMAIL'
  }
  return email
}

const scopes = [
  'email',  // get user's email address
  'https://mail.google.com/',  // IMAP and SMTP access
  'https://www.googleapis.com/auth/contacts.readonly',  // contacts, read-only
]

function getOrLookupAccessToken(): Promise<OauthCredentials> {
  return new Promise((resolve, reject) => {
    fs.readFile('accessToken.json', { encoding: 'utf8' }, (err, data: string) => {
      if (err) { reject(err) } else { resolve(JSON.parse(data)) }
    })
  })
  .catch(err => {
    return getAccessToken().then(credentials => {
      fs.writeFile('accessToken.json', JSON.stringify(credentials), { encoding: 'utf8' }, err => {
        if (err) {
          console.warn('error writing access token to disk', err)
        }
      })
      return credentials
    })
  })
}

function getAccessToken(): Promise<OauthCredentials> {
  return google.getAccessToken(() => new IndirectBrowser, {
    scopes,
    ...getClientIdAndSecret(),
  })
}

export async function getTokenGenerator(): Promise<google.XOAuth2Generator> {
  const credentials = await getOrLookupAccessToken()
  return google.getTokenGenerator({
    email: getEmailAddress(),
    credentials,
    ...getClientIdAndSecret(),
  })
}
