/* @flow */

import * as authActions from 'poodle-core/lib/actions/auth'
import * as chrome from 'poodle-core/lib/actions/chrome'
import * as q from 'poodle-core/lib/queries/conversations'
import { type Slurp, slurp, subscribe } from 'poodle-core/lib/slurp'
import * as Imap from 'poodle-service/lib/ImapInterface/Client'
import imapClient from '../../imapClient'
import ActivityStream from '../ActivityStream'

import type { State } from '../../reducers'

type OwnProps = {
  account: authActions.Account
}

const Inbox = slurp(
  ({ auth, chrome }: State, { }: OwnProps) => ({
    conversations: subscribe(Imap.search, 'in:inbox', auth.account, imapClient),
    errors: chrome.errors
  }),
  (dispatch: Dispatch<*>) => ({
    onDismissError (...args) {
      dispatch(chrome.dismissError(...args))
    }
  })
)(ActivityStream)

export default Inbox

