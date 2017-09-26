/*
 * This module provides an extra helper to look up a users profile information
 * once you have an OAuth access token.
 * 
 * Requires the OAuath scopes:
 * - https://www.googleapis.com/auth/contacts.readonly
 *
 * @flow
 */

import google from 'googleapis'
import { type OauthCredentials } from '../types'
import { type OauthClient } from './index'

export type Profile = {
  kind: 'plus#person',
  etag: string,
  occupation: string,
  emails: { value: Email, type: 'account' }[],
  urls: { value: URL, type: string, label: string }[],
  objectType: 'person',
  id: string,
  displayName: string,
  name: { familyName: string, givenName: string },
  tagline: string,
  url: URL,
  image: { url: URL, isDefault: boolean },
  organizations: { name: string, title: string, type: string, startDate: string, endDate: string, primary: boolean }[],
  placesLived: { value: string, primary?: boolean }[],
  isPlusUser: boolean,
  circledByCount: number,
  verified: boolean,
  cover: {
    layout: string,
    coverPhoto: { url: URL, height: number, width: number },
    coverInfo: { topImageOffset: number, leftImageOffset: number },
  },
}

type Email = string
type URL   = string

export function getProfile(
  getOauthClient: () => OauthClient,
  creds: OauthCredentials
): Promise<Profile> {
  const plus = google.plus('v1')
  const oauth = getOauthClient()
  oauth.setCredentials(creds)
  return new Promise((resolve, reject) => {
      plus.people.get({ userId: 'me', auth: oauth }, (err, resp) => {
        if (err) { reject(err) } else { resolve(resp) }
      })
  })
}
