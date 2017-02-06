/* @flow */

import type { Message } from 'arfe/lib/models/Message'

export type Thread = {
  id: string,
  messages: Message[],
}
