/* @flow */

import { type MessageOptions } from './types'

export const SEND = 'smtpActions/send'

export type Action<T> = { type: typeof SEND, message: MessageOptions }

export function send (message: MessageOptions): Action<void> {
  return { type: SEND, message }
}
