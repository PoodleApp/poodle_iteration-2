/* @flow */

import Conversation, { type Participants } from 'arfe/lib/models/Conversation'
import { type URI } from 'arfe/lib/models/uri'
import { type Account } from '../actions/auth'

export const SEND_LIKES = 'queue/sendLikes'
export const SENDING_LIKES = 'queue/sendingLikes'
export const DONE_SENDING_LIKES = 'queue/doneSendingLikes'
export const NEW_CONVERSATION = 'queue/newConversation'
export const SENDING = 'queue/sending'
export const DONE_SENDING = 'queue/doneSending'

export type Action =
  | {
      type: typeof SEND_LIKES,
      account: Account,
      conversation: Conversation,
      likedObjectUris: URI[],
      recipients: Participants
    }
  | {
      type: typeof SENDING_LIKES,
      likedObjectUris: URI[]
    }
  | {
      type: typeof DONE_SENDING_LIKES,
      likedObjectUris: URI[]
    }
  | {
      type: typeof NEW_CONVERSATION,
      account: Account,
      content: Content,
      recipients: Participants,
      subject: string
    }
  | {
      type: typeof SENDING,
      messageUris: URI[]
    }
  | {
      type: typeof DONE_SENDING,
      messageUris: URI[]
    }

type Content = {
  mediaType: string,
  string: string
}

export function sendLikes (
  account: Account,
  conversation: Conversation,
  likedObjectUris: URI[],
  recipients: Participants
): Action {
  return {
    type: SEND_LIKES,
    account,
    conversation,
    likedObjectUris,
    recipients
  }
}

export function sendingLikes (likedObjectUris: URI[]): Action {
  return { type: SENDING_LIKES, likedObjectUris }
}

export function doneSendingLikes (likedObjectUris: URI[]): Action {
  return { type: DONE_SENDING_LIKES, likedObjectUris }
}

export function newConversation (
  account: Account,
  recipients: Participants,
  content: Content,
  subject: string
): Action {
  return { type: NEW_CONVERSATION, account, recipients, content, subject }
}

export function sending (messageUris: URI[]): Action {
  return { type: SENDING, messageUris }
}

export function doneSending (messageUris: URI[]): Action {
  return { type: DONE_SENDING, messageUris }
}
