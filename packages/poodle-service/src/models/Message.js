/* @flow */

import type {
  MessageAttributes,
  MessagePart,
  MessageStruct,
} from 'imap'

export type Message = MessageAttributes

export function getPart(partId: string, msg: Message): ?MessagePart {
  return _findPart(part => part.partID === partId, msg.struct)
}

function _findPart(fn: (_: MessagePart) => boolean, struct: MessageStruct): ?MessagePart {
  const part: MessagePart = (struct[0]: any)
  if (fn(part)) {
    return part
  }
  else {
    const rest: MessageStruct[] = (struct.slice(1): any)
    for (const s of rest) {
      const result = _findPart(fn, s)
      if (result) {
        return result
      }
    }
  }
}
