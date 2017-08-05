/* @flow */

import * as AS       from 'activitystrea.ms'
import Moment        from 'moment'
import * as m        from 'mori'
import * as asutil   from '../util/activity'
import { catMaybes } from '../util/maybe'
import Address       from './Address'

import type {
  Address as ImapAddress,
  MessageAttributes,
  MessagePart,
  MessageStruct,
}                           from 'imap'
import type { Seq, Vector } from 'mori'
import type { URI }         from './uri'

export type MessageId = string

// native Javascript Map; this type is produced by 'mailparser'
type Headers = Map<string, HeaderValue>
type HeaderValue = string | string[] | {
  value: string | string[],
  params: { charset: string },
}

export default class Message {
  attributes:   MessageAttributes
  headers:      Headers
  id:           MessageId
  bcc:          ?(Address[])
  cc:           ?(Address[])
  from:         ?(Address[])
  inReplyTo:    ?MessageId
  receivedDate: Moment
  subject:      ?AS.models.LanguageValue
  to:           ?(Address[])

  constructor(msg: MessageAttributes, headers: Headers) {
    this.attributes   = msg
    this.headers      = headers
    // TODO: not every message has a messageId header
    this.id           = idFromHeaderValue(msg.envelope.messageId)
    this.bcc          = addressList(msg.envelope.bcc)
    this.cc           = addressList(msg.envelope.cc)
    this.from         = addressList(msg.envelope.from)
    this.inReplyTo    = msg.envelope.inReplyTo && idFromHeaderValue(msg.envelope.inReplyTo)
    this.receivedDate = Moment(msg.date)
    this.subject      = msg.envelope.subject && asutil.newString(msg.envelope.subject)
    this.to           = addressList(msg.envelope.to)
  }

  getPart(partId: string): ?MessagePart {
    return getPart(partId, this.attributes)
  }

  get activityParts(): Vector<MessagePart> {
    return activityParts(this.attributes)
  }

  // Returns any primary content types, following all branches under
  // `multipart/alternative` parts
  get allContentParts(): Seq<MessagePart> {
    return m.concat(this.htmlParts, this.textParts)
  }

  get htmlParts(): Vector<MessagePart> {
    return htmlParts(this.attributes)
  }

  get parts(): MessagePart[] {
    return m.intoArray(flatParts(this.attributes))
  }

  get textParts(): Vector<MessagePart> {
    return textParts(this.attributes)
  }

  get references(): MessageId[] {
    const refs = getHeaderValue('references', this.headers)
    return (refs || []).map(idFromHeaderValue)
  }

  get uid(): number {
    return this.attributes.uid
  }

  get uri(): URI {
    return `mid:${this.id}`
  }

  uriForPart(part: MessagePart): URI {
    const partId = part.partID
    if (!partId) {
      throw new Error("Cannot compute part URI for part with no content ID.")
    }
    return this.uriForPartId(partId)
  }

  uriForPartId(partId: string): URI {
    return `${this.uri}/${partId}`
  }

  // If the given URI has the `cid:` scheme, then it is relative to some message,
  // and does not specify a message ID in the URI itself. In that case, this
  // function returns a fully-qualified `mid:` URI that refers to the same message
  // part. If the given URI has the `mid:` scheme then this function returns the
  // URI unmodified.
  resolveUri(uri: URI): URI {
    const parsed = parseMidUri(uri)
    if (parsed && parsed.scheme === 'cid:' && parsed.partId) {
      const { scheme, partId } = parsed
      if (scheme === 'cid:' && partId) {
        return `${this.uri}/${partId}`
      }
    }
    return uri
  }
}



/*
 * Helpers to find parts within a message
 *
 * Note that `MessagePart` values contain *metadata*.
 */

function getPart(partId: string, msg: MessageAttributes): ?MessagePart {
  const matches = m.filter(part => part.partID === partId, flatParts(msg))
  return m.first(matches)
}

function topPart(msg: MessageAttributes): MessagePart {
  const [part, _] = unpack(msg.struct)
  return part
}

function textParts(msg: MessageAttributes): Vector<MessagePart> {
  const textFilter = ({ type, subtype }) => type === 'text' && subtype === 'plain'
  return getPrimaryParts(textFilter, msg)
}

function htmlParts(msg: MessageAttributes): Vector<MessagePart> {
  const htmlFilter = ({ type, subtype }) => type === 'text' && subtype === 'html'
  return getPrimaryParts(htmlFilter, msg)
}

function activityParts(msg: MessageAttributes): Vector<MessagePart> {
  const actFilter = ({ type, subtype }) => type === 'application' && subtype === 'activity+json'
  return getPrimaryParts(actFilter, msg)
}

// Follows all branches under `multipart/alternative` parts
function allContentParts(struct: MessageStruct): Vector<MessagePart> {
  function f(parts, part, nestedStructs) {
    if (part.subtype) {
      // not a multipart type
      return m.conj(parts, part)
    }
    if (part.type === 'alternative') {
      const nestedParts = m.mapcat(allContentParts, nestedStructs)
      return m.into(parts, nestedParts)
    }
    else {
      return parts
    }
  }
  const zero = m.vector()
  const filter = _ => false // Do not descend into `alternative` parts
  return foldPrimaryContent(f, zero, filter, struct)
}

function flatParts(msg: MessageAttributes): Seq<MessagePart> {
  return rec(msg.struct)

  function rec(struct: MessageStruct): Seq<MessagePart> {
    const [part, nestedStructs] = unpack(struct)

    // `node-imap` gives multipart parts where `type` is set to the subtype, and
    // `subtype` is not set
    if (!part.subtype) {
      return m.mapcat(rec, nestedStructs)
    }
    else {
      return m.seq([part])
    }
  }
}

// The email spec has rules about which MIME parts in a MIME hierarchy represent
// content to be displayed as message content, as opposed to attachments,
// supporting content that may be referred to by the primary content,
// cryptographic signatures, etc. This function traverses primary content,
// accumulating some result value.
function foldPrimaryContent<T>(
  f: (accum: T, part: MessagePart, nestedStructs: MessageStruct[]) => T,
  accum: T,
  filter: (_: MessagePart) => boolean, // Determines which part to pick in an `alternative`
  struct: MessageStruct,
): T {
  const [part, nestedStructs] = unpack(struct)

  const result = f(accum, part, nestedStructs)

  // Not sure if it is a client library issue: in multipart types I'm seeing the
  // multipart as the `type` property, with no value for `subtype`. In other
  // part types `type` and `subtype` are assigned as I expect.
  const subtype = part.subtype || part.type

  // No subparts means that this is a leaf node on the MIME tree. This is the
  // base case.
  if (nestedStructs.length === 0) {
    return result
  }

  // mixed: the first part is primary, the remaining parts are attachments
  else if (subtype === 'mixed') {
    const primary = m.first(nestedStructs)
    if (primary) {
      return foldPrimaryContent(f, result, filter, primary)
    }
    else {
      return result
    }
  }

  // alternative: recurse into the last part that matches the filter, or that
  // is an ancestor of a part that matches the predicate
  else if (subtype === 'alternative') {
    // Look ahead to find to try to find a part in each subtree that matches the
    // filter.
    const nestedMatches: Seq<?MessagePart> = m.map(
      struct => foldPrimaryContent(
        (accum, part) => accum || (filter(part) ? part : undefined),
        undefined,
        filter,
        struct,
      ),
      nestedStructs
    ) 

    // Filter `nestedStructs` down to values that contain a matching part.
    const matchingStructs: Seq<MessageStruct> = catMaybes(m.map(
      (struct, match) => match && struct,
      nestedStructs,
      nestedMatches,
    ))

    // Identify the last nested struct that contains a part that matches the
    // filter.
    const primary = m.last(matchingStructs)

    if (primary) {
      return foldPrimaryContent(f, result, filter, primary)
    }
    else {
      return result
    }
  }

  // related: the first part is primary, the remaining parts are referenced by
  // the primary content (e.g., inline images)
  else if (subtype === 'related') {
    const primary = m.first(nestedStructs)
    if (primary) {
      return foldPrimaryContent(f, result, filter, primary)
    }
    else {
      return result
    }
  }

  // signed: the first part is the primary content (which is signed);
  // there should be another part, which should be the signature
  else if (subtype.indexOf('signed') > -1) {
    const primary = m.first(nestedStructs)
    if (primary) {
      return foldPrimaryContent(f, result, filter, primary)
    }
    else {
      return result
    }
  }

  else {
    // TODO: What to do when encountering unknown multipart subtype?
    throw new Error(`Encountered unknown multipart subtype: multipart/${subtype}`)
  }
}

function getPrimaryParts(
  filter: (_: MessagePart) => boolean, // Determines which part to pick in an `alternative`
  msg: MessageAttributes,
): Vector<MessagePart> {
  const f    = (parts, part) => filter(part) ? m.conj(parts, part) : parts
  const zero = m.vector()
  return foldPrimaryContent(f, zero, filter, msg.struct)
}


/* More user-friendly access to `MessageStruct` values */

function unpack(struct: MessageStruct): [MessagePart, MessageStruct[]] {
  return [
    (struct[0]: any),
    (struct.slice(1): any),
  ]
}

// Use a regular expression to trim angle brackets off
const messageIdPattern = /<(.*)>/

// `

function idFromHeaderValue(id: MessageId): MessageId {
  return id.replace(messageIdPattern, (_, id) => id)
}

function addressList(addrs: ?(ImapAddress[])): ?(Address[]) {
  if (addrs) {
    return addrs.map(a => new Address(a))
  }
}

function getHeaderValue(key: string, headers: Headers): ?string[] {
  return normalizeHeaderValue(headers.get(key))
}

function normalizeHeaderValue(v: ?HeaderValue): ?string[] {
  if (!v) { return }
  if (typeof v === 'string') { return [v] }
  if (v instanceof Array) { return v }
  if (v.value) { return normalizeHeaderValue(v.value) }
}


/* Parse message URIs */

const midExp = /(mid:|cid:)([^/]+)(?:\/(.+))?$/

export function parseMidUri(uri: URI): ?{ scheme: string, messageId: ?MessageId, partId: ?string } {
  const matches = uri.match(midExp)
  if (matches) {
    const scheme    = matches[1]
    const messageId = scheme === 'mid:' ? matches[2] : undefined
    const partId    = scheme === 'cid:' ? matches[2] : matches[3]
    return { scheme, messageId, partId }
  }
}
