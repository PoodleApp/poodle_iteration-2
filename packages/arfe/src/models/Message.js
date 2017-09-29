/* @flow */

import * as AS from 'activitystrea.ms'
import Moment from 'moment'
import * as m from 'mori'
import * as asutil from '../util/activity'
import { catMaybes } from '../util/maybe'
import Address from './Address'
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
type Headers = Map<string, HeaderValue>
type HeaderValue =
  | string
  | string[]
  | {
      value: string | string[],
      params: { charset: string }
    }

export type PerBoxMetadata = {
  boxName: string,
  flags: Flag[],
  uid: UID,
  uidvalidity: UID
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
  perBoxMetadata: ?(PerBoxMetadata[])

  constructor (
    msg: MessageAttributes,
    headers: Headers,
    perBoxMetadata?: PerBoxMetadata[]
  ) {
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
    this.perBoxMetadata = perBoxMetadata
  }

  // Request metadata for a message part by `partId` or `contentId`. Content ID
  // is assigned by the `Content-ID` header of the MIME part (which may be
  // absent). A part ID is assigned to every MIME part based on order of
  // appearance in the message.
  getPart ({
    partId,
    contentId
  }: {
    partId?: string,
    contentId?: string
  }): ?MessagePart {
    if ((partId && contentId) || (!partId && !contentId)) {
      throw new Error(
        'must specify *one of* `partId` or `contentId` when requesting message part'
      )
    }
    if (partId) {
      return getPartByPartId(partId, this.attributes)
    }
    if (contentId) {
      const part = getPartByContentId(contentId, this.attributes)
      if (part) {
        return part
      }

      // TODO: because we are falling back to part IDs for `mid:` URIs (in
      // contradiction of RFC-2392) it is useful to fall back to looking up
      // a part by part ID if lookup by content ID fails
      return getPartByPartId(contentId, this.attributes)
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

  get references (): MessageId[] {
    const refs = getHeaderValue('references', this.headers)
    return (refs || []).map(idFromHeaderValue).filter(id => !!id)
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
    part => part.id && (idFromHeaderValue(part.id) === contentId),
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
  } else if (subtype === 'mixed') {
    // mixed: the first part is primary, the remaining parts are attachments
    const primary = m.first(nestedStructs)
    if (primary) {
      return foldPrimaryContent(f, result, filter, primary)
    } else {
      return result
    }
  } else if (subtype === 'alternative') {
    // alternative: recurse into the last part that matches the filter, or that
    // is an ancestor of a part that matches the predicate
    // Look ahead to find to try to find a part in each subtree that matches the
    // filter.
    const nestedMatches: Seq<?MessagePart> = m.map(
      struct =>
        foldPrimaryContent(
          (accum, part) => accum || (filter(part) ? part : undefined),
          undefined,
          filter,
          struct
        ),
      nestedStructs
    )

    // Filter `nestedStructs` down to values that contain a matching part.
    const matchingStructs: Seq<MessageStruct> = catMaybes(
      m.map((struct, match) => match && struct, nestedStructs, nestedMatches)
    )

    // Identify the last nested struct that contains a part that matches the
    // filter.
    const primary = m.last(matchingStructs)

    if (primary) {
      return foldPrimaryContent(f, result, filter, primary)
    } else {
      return result
    }
  } else if (subtype === 'related') {
    // related: the first part is primary, the remaining parts are referenced by
    // the primary content (e.g., inline images)
    const primary = m.first(nestedStructs)
    if (primary) {
      return foldPrimaryContent(f, result, filter, primary)
    } else {
      return result
    }
  } else if (subtype.indexOf('signed') > -1) {
    // signed: the first part is the primary content (which is signed);
    // there should be another part, which should be the signature
    const primary = m.first(nestedStructs)
    if (primary) {
      return foldPrimaryContent(f, result, filter, primary)
    } else {
      return result
    }
  } else {
    // TODO: What to do when encountering unknown multipart subtype?
    throw new Error(
      `Encountered unknown multipart subtype: multipart/${subtype}`
    )
  }
}

function getPrimaryParts (
  filter: (_: MessagePart) => boolean, // Determines which part to pick in an `alternative`
  msg: MessageAttributes
): Vector<MessagePart> {
  const f = (parts, part) => (filter(part) ? m.conj(parts, part) : parts)
  const zero = m.vector()
  return foldPrimaryContent(f, zero, filter, msg.struct)
}

/* More user-friendly access to `MessageStruct` values */

function unpack (struct: MessageStruct): [MessagePart, MessageStruct[]] {
  return [(struct[0]: any), (struct.slice(1): any)]
}

// Use a regular expression to trim angle brackets off
const messageIdPattern = /<(.*)>/

// `

function idFromHeaderValue (id: MessageId): MessageId {
  return id.replace(messageIdPattern, (_, id) => id)
}

function addressList (addrs: ?(ImapAddress[])): ?(Address[]) {
  if (addrs) {
    return addrs.map(a => new Address(a))
  }
}

function getHeaderValue (key: string, headers: Headers): ?(string[]) {
  return normalizeHeaderValue(headers.get(key))
}

function normalizeHeaderValue (v: ?HeaderValue): ?(string[]) {
  if (!v) {
    return
  }
  if (typeof v === 'string') {
    return [v]
  }
  if (v instanceof Array) {
    return v
  }
  if (v.value) {
    return normalizeHeaderValue(v.value)
  }
}
