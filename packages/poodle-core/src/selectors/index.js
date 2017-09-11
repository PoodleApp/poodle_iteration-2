/* @flow */

import { sameEmail } from 'arfe/lib/models/uri'
import { type State as AuthState } from '../reducers/auth'
import { type State as ImapState } from '../imap-redux'

export function loggedIn<State: { auth: AuthState, imap: ImapState }> (
  { auth, imap }: State
): boolean {
  const email = auth.account && auth.account.email
  return !!imap.accounts && imap.accounts.some(a => sameEmail(a.email, email))
}
