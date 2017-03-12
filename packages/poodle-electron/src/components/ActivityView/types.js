/* @flow */

import type { Account } from 'poodle-core/lib/actions/auth'
import type {
  Activity     as GraphQLActivity,
  Conversation as GraphQLConversation,
} from 'poodle-core/lib/queries/localConversation'
import type { Dispatch } from 'redux'

export type Activity     = GraphQLActivity
export type Conversation = GraphQLConversation

export type ActivityViewProps = {
  account:      Account,
  activity:     Activity,
  conversation: Conversation,
  dispatch:     Dispatch<any>,
  editing:      ?ActivityId,
  loading:      boolean,
  nestLevel?:   number,
}

type ActivityId = string
