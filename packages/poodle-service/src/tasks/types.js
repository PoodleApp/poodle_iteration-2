/* @flow */

import type DerivedActivity from 'arfe/lib/models/DerivedActivity'
import type Conversation from 'arfe/lib/models/Conversation'
import { type ConnectionState } from '../request/state'
import { type Email } from '../types'

export type LiveConversation = {
  conversation: Conversation,
  changes?: DerivedActivity[]
}

export type State = {
  accountName: ?Email,
  connectionState: ConnectionState
}
