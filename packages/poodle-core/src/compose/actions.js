/* @flow */

import Conversation, { type Participants } from 'arfe/lib/models/Conversation'
import { type Account } from '../actions/auth'

export const SEND: 'compose/send' = 'compose/send'
export const SENDING: 'compose/sending' = 'compose/sending'
export const SENT: 'compose/sent' = 'compose/sent'
export const SET_CONTENT: 'compose/setContent' = 'compose/setContent'

export type Action =
  | {
    type: typeof SEND,
      account: Account,
      conversation: Conversation,
      recipients: Participants,
      content: Content
    }
  | {
      type: typeof SENDING
    }
  | {
      type: typeof SENT
    }
  | {
      type: typeof SET_CONTENT,
      content: string
    }

type Content = {
  mediaType: string,
  string: string
}

export function send (
  account: Account,
  conversation: Conversation,
  recipients: Participants,
  content: Content
): Action {
  return { type: SEND, account, conversation, recipients, content }
}

export function sending (): Action {
  return { type: SENDING }
}

export function sent (): Action {
  return { type: SENT }
}

export function setContent (content: string): Action {
  return { type: SET_CONTENT, content }
}
