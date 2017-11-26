/* @flow */

import * as kefir from 'kefir'
import * as authActions from 'poodle-core/lib/actions/auth'
import * as chromeActions from 'poodle-core/lib/actions/chrome'
import { type Slurp, slurp, subscribe } from 'poodle-core/lib/slurp'
import * as tasks from 'poodle-service/lib/tasks'
import { perform } from '../../imapClient'
import ActivityStream from '../ActivityStream'

import type { State } from '../../reducers'

type OwnProps = {
  account: authActions.Account
}

const WithData = slurp(
  ({ auth, chrome }: State, { account }: OwnProps) => {
    const email = auth.account && auth.account.email
    const conversations =
      email && chrome.searchQuery
        ? perform(
            tasks.queryConversationsForListView,
          [
            {
              limit: 100,
              query: chrome.searchQuery
            }
          ],
            { accountName: email }
          )
        : subscribe(kefir.constant, [])
    return {
      conversations,
      errors: chrome.errors,
      searchQuery: chrome.searchQuery
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
