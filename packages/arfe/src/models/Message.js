/* @flow strict */

import * as AS from 'activitystrea.ms'
import Moment from 'moment'
import * as m from 'mori'
import * as asutil from '../util/activity'
import { catMaybes } from '../util/maybe'
import Address from './Address'
import * as P from './MessagePart'
import { midUri, parseMidUri } from './uri'

export { parseMidUri } from './uri'

import type {
  Address as ImapAddress,
  Flag,
  MessageAttributes,
  MessagePart,
  MessageStruct,
  UID
} from 'imap'
import type { Seq, Vector } from 'mori'
import type { URI } from './uri'

export type MessageId = string

// native Javascript Map; this type is produced by 'mailparser'
export type Headers = Map<string, HeaderValue>
export type HeaderValue =
  | any
  | {
      value: any,
      params?: { charset?: string }
    }

export default class Message {
  attributes: MessageAttributes
  headers: Headers
  id: MessageId
  bcc: ?(Address[])
  cc: ?(Address[])
  from: ?(Address[])
  inReplyTo: ?MessageId
  receivedDate: Moment
  subject: ?AS.models.LanguageValue
  to: ?(Address[])

  constructor (msg: MessageAttributes, headers: Headers) {
    this.attributes = msg
    this.headers = headers
    // TODO: not every message has a messageId header
    this.id = idFromHeaderValue(msg.envelope.messageId)
    this.bcc = addressList(msg.envelope.bcc)
    this.cc = addressList(msg.envelope.cc)
    this.from = addressList(msg.envelope.from)
    this.inReplyTo =
      msg.envelope.inReplyTo && idFromHeaderValue(msg.envelope.inReplyTo)
    this.receivedDate = Moment(msg.date)
    this.subject =
      msg.envelope.subject && asutil.newString(msg.envelope.subject)
    this.to = addressList(msg.envelope.to)
  }

  // Request metadata for a message part by `partId` or `contentId`. Content ID
  // is assigned by the `Content-ID` header of the MIME part (which may be
  // absent). A part ID is assigned to every MIME part based on order of
  // appearance in the message.
  getPart (partRef: P.PartRef): ?MessagePart {
    switch (partRef.type) {
      case P.AMBIGUOUS_ID:
        const id = partRef.id
        return (
          getPartByContentId(id, this.attributes) ||
          getPartByPartId(id, this.attributes)
        )
      case P.CONTENT_ID:
        return getPartByContentId(partRef.contentId, this.attributes)
      case P.PART_ID:
        return getPartByPartId(partRef.partId, this.attributes)
    }
  }

  get activityParts (): Vector<MessagePart> {
    return activityParts(this.attributes)
  }

  // Returns any primary content types, following all branches under
  // `multipart/alternative` parts
  get allContentParts (): Seq<MessagePart> {
    return m.concat(this.htmlParts, this.textParts)
  }

  // Assume that the first value in the references list is the first message in
  // the thread
  get conversationId (): MessageId {
    return this.references.concat(this.id)[0]
  }

  get htmlParts (): Vector<MessagePart> {
    return htmlParts(this.attributes)
  }

  get parts (): MessagePart[] {
    return m.intoArray(flatParts(this.attributes))
  }

  get textParts (): Vector<MessagePart> {
    return textParts(this.attributes)
  }

  get attachmentParts (): Vector<MessagePart> {
    return attachmentParts(this.attributes)
  }

  get references (): MessageId[] {
    const val = getHeaderValue('references', this.headers)
    const refs = typeof val === 'string' ? val.split(/\s+/) : val
    return refs.map(idFromHeaderValue).filter(id => !!id)
  }

  get uid (): number {
    return this.attributes.uid
  }

  get uri (): URI {
    return midUri(this.id)
  }

  uriForPart (part: MessagePart): URI {
    // `MessagePart` contains `partID` and `id` properties. The `id` property
    // contains the specified content ID for the part, but may not be present.
    // It looks like `partID` is assigned based on the order of parts in the
    // message.
    //
    // It is very useful for our purposes to have a URI for *every* message
    // part. So we are going to fall back to using the `partID` for the content
    // ID part of the URI for parts that do not have `Content-ID` headers. Note
    // that this is not in conformance with RFC-2392! This could lead to
    // ambiguity in any cose where a `Content-ID` contains only numbers or
    // numbers and dots. TODO!
    const contentId = part.id ? part.id : part.partID
    if (!contentId) {
      throw new Error('cannot compute URI for a message part with no ID')
    }
    return this.uriForContentId(contentId)
  }

  // TODO
  uriForContentId (contentId: string): URI {
    return midUri(this.id, contentId)
  }

  uriForPartRef (partRef: P.PartRef): URI {
    let id
    switch (partRef.type) {
      case P.AMBIGUOUS_ID:
        id = partRef.id
        break
      case P.CONTENT_ID:
        id = partRef.contentId
        break
      case P.PART_ID:
        id = partRef.partId
        break
    }
    return midUri(this.id, id)
  }

  // If the given URI has the `cid:` scheme, then it is relative to some message,
  // and does not specify a message ID in the URI itself. In that case, this
  // function returns a fully-qualified `mid:` URI that refers to the same message
  // part. If the given URI has the `mid:` scheme then this function returns the
  // URI unmodified.
  resolveUri (uri: URI): URI {
    const parsed = parseMidUri(uri)
    if (parsed) {
      const { scheme, contentId } = parsed
      if (scheme === 'cid:' && contentId) {
        return this.uriForContentId(contentId)
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

function getPartByPartId (partId: string, msg: MessageAttributes): ?MessagePart {
  const matches = m.filter(part => part.partID === partId, flatParts(msg))
  return m.first(matches)
}

function getPartByContentId (
  contentId: string,
  msg: MessageAttributes
): ?MessagePart {
  const matches = m.filter(
    part => part.id && idFromHeaderValue(part.id) === contentId,
    flatParts(msg)
  )
  return m.first(matches)
}

function topPart (msg: MessageAttributes): MessagePart {
  const [part, _] = unpack(msg.struct)
  return part
}

function textParts (msg: MessageAttributes): Vector<MessagePart> {
  const textFilter = ({ type, subtype }) =>
    type === 'text' && subtype === 'plain'
  return getPrimaryParts(textFilter, msg)
}

function htmlParts (msg: MessageAttributes): Vector<MessagePart> {
  const htmlFilter = ({ type, subtype }) =>
    type === 'text' && subtype === 'html'
  return getPrimaryParts(htmlFilter, msg)
}

function activityParts (msg: MessageAttributes): Vector<MessagePart> {
  const actFilter = ({ type, subtype }) =>
    type === 'application' && subtype === 'activity+json'
  return getPrimaryParts(actFilter, msg)
}

// Follows all branches under `multipart/alternative` parts
function allContentParts (struct: MessageStruct): Vector<MessagePart> {
  function f (parts, part, nestedStructs) {
    if (part.subtype) {
      // not a multipart type
      return m.conj(parts, part)
    }
    if (part.type === 'alternative') {
      const nestedParts = m.mapcat(allContentParts, nestedStructs)
      return m.into(parts, nestedParts)
    } else {
      return parts
    }
  }
  const zero = m.vector()
  const filter = _ => false // Do not descend into `alternative` parts
  return foldPrimaryContent(f, zero, filter, struct)
}

function flatParts (msg: MessageAttributes): Seq<MessagePart> {
  return rec(msg.struct)

  function rec (struct: MessageStruct): Seq<MessagePart> {
    const [part, nestedStructs] = unpack(struct)

    // `node-imap` gives multipart parts where `type` is set to the subtype, and
    // `subtype` is not set
    if (!part.subtype) {
      return m.mapcat(rec, nestedStructs)
    } else {
      return m.seq([part])
    }
  }
}

// Traverse MIME tree, using a `selectSubtrees` callback to choose which
// subtrees to traverse
function foldParts<T> (
  f: (accum: T, part: MessagePart, nestedStructs: MessageStruct[]) => T,
  accum: T,
  selectSubtrees: (
    subtype: string,
    nestedStructs: MessageStruct[]
  ) => MessageStruct[],
  struct: MessageStruct
): T {
  const [part, nestedStructs] = unpack(struct)
  const result = f(accum, part, nestedStructs)

  // Not sure if it is a client library issue: in multipart types I'm seeing the
  // multipart as the `type` property, with no value for `subtype`. In other
  // part types `type` and `subtype` are assigned as I expect.
  const subtype = part.subtype || part.type

  if (nestedStructs.length === 0) {
    return result
  }
  const structs = selectSubtrees(subtype, nestedStructs)
  return m.reduce(
    (acc, str) => foldParts(f, acc, selectSubtrees, str),
    result,
    selectSubtrees(subtype, nestedStructs)
  )
}

// A subtree selector for use with `foldParts`
function selectPrimaryContent (
  filter: (_: MessagePart) => boolean // Determines which part to pick in an `alternative`
): (subtype: string, nestedStructs: MessageStruct[]) => MessageStruct[] {
  return (subtype, nestedStructs) => {
    if (subtype === 'mixed') {
      // mixed: the first part is primary, the remaining parts are attachments
      return nestedStructs.slice(0, 1)
    } else if (subtype === 'alternative') {
      // alternative: recurse into the last part that matches the filter, or that
      // is an ancestor of a part that matches the predicate
      // Look ahead to find to try to find a part in each subtree that matches the
      // filter.
      const matchingStructs = nestedStructs.filter(struct =>
        foldParts(
          (accum, part) => accum || filter(part),
          false,
          selectPrimaryContent(filter),
          struct
        )
      )
      // Identify the last nested struct that contains a part that matches the
      // filter.
      return matchingStructs.slice(-1)
    } else if (subtype === 'related') {
      // related: the first part is primary, the remaining parts are referenced by
      // the primary content (e.g., inline images)
      return nestedStructs.slice(0, 1)
    } else if (subtype.indexOf('signed') > -1) {
      // signed: the first part is the primary content (which is signed);
      // there should be another part, which should be the signature
      // TODO: verify signatures
      return nestedStructs.slice(0, 1)
    } else {
      // TODO: What to do when encountering unknown multipart subtype?
      throw new Error(
        `Encountered unknown multipart subtype: multipart/${subtype}`
      )
    }
  }
}

// The email spec has rules about which MIME parts in a MIME hierarchy represent
// content to be displayed as message content, as opposed to attachments,
// supporting content that may be referred to by the primary content,
// cryptographic signatures, etc. This function traverses primary content,
// accumulating some result value.
function foldPrimaryContent<T> (
  f: (accum: T, part: MessagePart, nestedStructs: MessageStruct[]) => T,
  accum: T,
  filter: (_: MessagePart) => boolean, // Determines which part to pick in an `alternative`
  struct: MessageStruct
): T {
  return foldParts(f, accum, selectPrimaryContent(filter), struct)
}

function getPrimaryParts (
  filter: (_: MessagePart) => boolean, // Determines which part to pick in an `alternative`
  msg: MessageAttributes
): Vector<MessagePart> {
  const f = (parts, part) => (filter(part) ? m.conj(parts, part) : parts)
  const zero = m.vector()
  return foldPrimaryContent(f, zero, filter, msg.struct)
}

// TODO: I think this will get the primary content part if the message contains
// exactly one part (i.e., no multipart parts)
function foldAttachmentParts<T> (
  f: (accum: T, part: MessagePart, nestedStructs: MessageStruct[]) => T,
  accum: T,
  filter: (_: MessagePart) => boolean, // Determines which part to pick in an `alternative`
  struct: MessageStruct
): T {
  const fallbackSelector = selectPrimaryContent(filter)
  function selector (subtype: string, nestedStructs: MessageStruct[]): MessageStruct[] {
    if (subtype === 'mixed') {
      // mixed: the first part is primary, the remaining parts are attachments
      return nestedStructs.slice(1)
    } else {
      return fallbackSelector(subtype, nestedStructs)
    }
  }
  return foldParts(f, accum, selector, struct)
}

function attachmentParts (msg: MessageAttributes): Vector<MessagePart> {
  const f = (parts, part) => (!P.isMultipart(part) ? m.conj(parts, part) : parts)
  const filter = _ => true
  const zero = m.vector()
  return foldAttachmentParts(f, zero, filter, msg.struct)
}

/* More user-friendly access to `MessageStruct` values */

function unpack (struct: MessageStruct): [MessagePart, MessageStruct[]] {
  return [(struct[0]: any), (struct.slice(1): any)]
}

// Use a regular expression to trim angle brackets off
const messageIdPattern = /<(.*)>/

export function idFromHeaderValue (id: MessageId): MessageId {
  return id.replace(messageIdPattern, (_, id) => id)
}

function addressList (addrs: ?(ImapAddress[])): ?(Address[]) {
  if (addrs) {
    return addrs.map(a => new Address(a))
  }
}

function getHeaderValue (key: string, headers: Headers): string | string[] {
  return normalizeHeaderValue(headers.get(key))
}

// TODO: fix up types here
function normalizeHeaderValue (v: any): any {
  if (!v) {
    return []
  }
  if (typeof v === 'string') {
    return v
  }
  if (v instanceof Array) {
    return v.filter(e => typeof e === 'string')
  }
  if (v.value) {
    return normalizeHeaderValue(v.value)
  }
}
