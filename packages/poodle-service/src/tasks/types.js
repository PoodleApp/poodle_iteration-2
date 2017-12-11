/* @flow */

import type DerivedActivity from 'arfe/lib/models/DerivedActivity'
import type Conversation from 'arfe/lib/models/Conversation'

export type LiveConversation = {
  conversation: Conversation,
  changes?: DerivedActivity[]
}
