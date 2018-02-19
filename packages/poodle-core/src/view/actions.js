/* @flow */

import type Message from 'arfe/lib/models/Message'
import * as Part from 'arfe/lib/models/MessagePart'
import { type Account } from '../actions/auth'

export const OPEN_ATTACHMENT = 'view/openAttachment'

export type Action = {
  type: typeof OPEN_ATTACHMENT,
  account: Account,
  message: Message,
  attachment: Part.MessagePart
}

export function openAttachment ({
  account,
  message,
  attachment
}: {
  account: Account,
  message: Message,
  attachment: Part.MessagePart
}): Action {
  return { type: OPEN_ATTACHMENT, account, message, attachment }
}
