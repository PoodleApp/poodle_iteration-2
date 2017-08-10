/* @flow */

import Conversation, { type Participants } from 'arfe/lib/models/Conversation'
import { type URI } from 'arfe/lib/models/uri'
import { type Account } from '../actions/auth'

export const SEND_LIKES: 'queue/sendLikes' = 'queue/sendLikes'
export const SENDING_LIKES: 'queue/sendingLikes' = 'queue/sendingLikes'
export const DONE_SENDING_LIKES: 'queue/doneSendingLikes' = 'queue/doneSendingLikes'

export type Action = {
  type: typeof SEND_LIKES,
  account: Account,
  conversation: Conversation,
  likedObjectUris: URI[],
  recipients: Participants
} | {
  type: typeof SENDING_LIKES,
  likedObjectUris: URI[]
} | {
  type: typeof DONE_SENDING_LIKES,
  likedObjectUris: URI[]
}

export function sendLikes (
  account: Account,
  conversation: Conversation,
  likedObjectUris: URI[],
  recipients: Participants
): Action {
  return { type: SEND_LIKES, account, conversation, likedObjectUris, recipients }
}

export function sendingLikes (likedObjectUris: URI[]): Action {
  return { type: SENDING_LIKES, likedObjectUris }
}

export function doneSendingLikes(likedObjectUris: URI[]): Action {
  return { type: DONE_SENDING_LIKES, likedObjectUris }
}
