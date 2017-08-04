/* @flow */

import Conversation, { type Participants } from 'arfe/lib/models/Conversation'
import { type Account } from './auth'

export type Action = {
  type: 'compose/send',
  account: Account,
  conversation: Conversation,
  recipients: Participants,
  content: string
}

export function send (
  account: Account,
  conversation: Conversation,
  recipients: Participants,
  content: string
): Action {
  return { type: 'compose/send', account, conversation, recipients, content }
}
