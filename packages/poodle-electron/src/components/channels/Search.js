/* @flow */

import * as kefir from 'kefir'
import * as chromeActions from 'poodle-core/lib/actions/chrome'
import * as q from 'poodle-core/lib/queries/conversations'
import { type Slurp, slurp, subscribe } from 'poodle-core/lib/slurp'
import { type AccountMetadata } from 'poodle-service'
import imapClient from '../../imapClient'
import ActivityStream from '../ActivityStream'

import type { State } from '../../reducers'

type OwnProps = {
  account: AccountMetadata
}

const WithData = slurp(
  ({ auth, chrome }: State, { account }: OwnProps) => ({
    conversations: chrome.searchQuery
      ? subscribe(imapClient.search, chrome.searchQuery, auth.account)
      : subscribe(kefir.constant, []),
    errors: chrome.errors
  }),
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
