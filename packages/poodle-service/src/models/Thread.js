/* @flow */

import type { Message } from './Message'

export type Thread = {
  id: string,
  messages: Message[],
}
