/* @flow */

import type { MessagePart, MessageStruct } from 'imap'
import * as MP from '../models/MessagePart'

opaque type Alternatives = MessageStruct
opaque type Attachments = MessageStruct
opaque type PrimaryPart = MessageStruct
opaque type Related = MessageStruct

export function buildStruct (opts: {
  alternatives: MessagePart[],
  attachments?: ?MessagePart[],
  related?: ?MessagePart[],
}): MessageStruct {
  const withAlternatives = alternatives(opts.alternatives.map(primaryPart))
  const withRelated = (opts.related && opts.related.length > 0)
    ? related(withAlternatives, opts.related)
    : withAlternatives
  const withAttachments = (opts.attachments && opts.attachments.length > 0)
    ? attachments(withRelated, opts.attachments)
    : withRelated
  return toStruct(withAttachments)
}

export function related(struct: Alternatives | PrimaryPart, relatedParts: MessagePart[]): Related {
  const related: MessagePart = { type: 'related', params: {} }
  return [related, struct, ...relatedParts.map(partToStruct)]
}

export function primaryPart(part: MessagePart): PrimaryPart {
  return partToStruct(part)
}

export function alternatives (parts: PrimaryPart[]): Alternatives {
  const alternative: MessagePart = { type: 'alternative', params: {} }
  return [alternative, ...parts]
}

export function attachments (struct: Alternatives | PrimaryPart | Related, parts: MessagePart[]): Attachments {
  const mixed: MessagePart = { type: 'mixed', params: {} }
  return [mixed, struct, ...parts.map(partToStruct)]
}

/*
 * Maps an opaque type used internally by this module into the `MessageStruct`
 * type, which can be consumed by other modules. This function also sets
 * `partID` values on every non-multipart type.
 */
export function toStruct (struct: Alternatives | Attachments | Related | PrimaryPart): MessageStruct {
  let partID = 0
  function applyId <T: MessagePart | MessageStruct>(struct: T): T {
    if (struct instanceof Array) {
      return struct.map(applyId)
    } else if (!MP.isMultipart(struct)) {
      partID += 1
      return { ...struct, partID: String(partID) }
    } else {
      return struct
    }
  }
  return applyId(struct)
}

function partToStruct (s: MessagePart | MessageStruct): MessageStruct {
  return (s instanceof Array) ? s : [s]
}
