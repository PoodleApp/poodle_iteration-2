/* @flow */

import * as kefir from 'kefir'
import * as authActions from 'poodle-core/lib/actions/auth'
import * as chrome from 'poodle-core/lib/actions/chrome'
import * as q from 'poodle-core/lib/queries/conversations'
import { type Slurp, slurp, subscribe } from 'poodle-core/lib/slurp'
import * as tasks from 'poodle-service/lib/tasks'
import { perform } from '../../imapClient'
import ActivityStream from '../ActivityStream'

import type { State } from '../../reducers'

type OwnProps = {
  account: authActions.Account
}

const Inbox = slurp(
  ({ auth, chrome }: State, { account }: OwnProps) => {
    const email = auth.account && auth.account.email
    const conversations =
      email
        ? perform(
            tasks.queryConversationsForListView,
          [
            {
              limit: 30,
              query: 'in:inbox'
            }
          ],
            { accountName: email }
          )
        : subscribe(kefir.constant, [])
    return {
      conversations,
      errors: chrome.errors
    }
  },
  (dispatch: Dispatch<*>) => ({
    onDismissError (...args) {
      dispatch(chrome.dismissError(...args))
    }
  })
)(ActivityStream)

export default Inbox

