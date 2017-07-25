/* @flow */

import Conversation from 'arfe/lib/models/Conversation'
import DerivedActivity from 'arfe/lib/models/DerivedActivity'

import type { Account } from 'poodle-core/lib/actions/auth'
import type { Dispatch } from 'redux'

export type ActivityViewProps = {
  account: Account,
  activity: DerivedActivity,
  conversation: Conversation,
  dispatch: Dispatch<any>,
  editing: ?ActivityId,
  loading: boolean,
  nestLevel?: number
}

type ActivityId = string
