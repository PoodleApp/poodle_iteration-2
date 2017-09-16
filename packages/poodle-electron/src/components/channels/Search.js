/* @flow */

import * as kefir from 'kefir'
import * as authActions from 'poodle-core/lib/actions/auth'
import * as chromeActions from 'poodle-core/lib/actions/chrome'
import * as q from 'poodle-core/lib/queries/conversations'
import { type Slurp, slurp, subscribe } from 'poodle-core/lib/slurp'
import * as Imap from 'poodle-service/lib/ImapInterface/Client'
import imapClient from '../../imapClient'
import ActivityStream from '../ActivityStream'

import type { State } from '../../reducers'

type OwnProps = {
  account: authActions.Account
}

const WithData = slurp(
  ({ auth, chrome }: State, { account }: OwnProps) => {
    const email = auth.account && auth.account.email
    return {
      conversations:
        email && chrome.searchQuery
          ? subscribe(
              Imap.queryForListView,
            {
              account: email,
              limit: 30,
              query: chrome.searchQuery
            },
              imapClient
            )
          : subscribe(kefir.constant, []),
      errors: chrome.errors
    }
  },
  (dispatch: Dispatch<*>) => ({
    onDismissError (...args) {
      dispatch(chromeActions.dismissError(...args))
    },
    onSearch (...args) {
      dispatch(chromeActions.search(...args))
    }
  })
)(ActivityStream)

export default WithData
