/* @flow */

import * as AS from 'activitystrea.ms'
import BuildMail from 'buildmail'
import * as m from 'mori'
import * as uuid from 'node-uuid'
import * as Vocab from 'vocabs-as'
import Address from '../models/Address'
import Conversation, * as Conv from '../models/Conversation'
import * as LV from '../models/LanguageValue'
import { midUri, sameEmail } from '../models/uri'
import * as asutil from '../util/activity'
import { uniqBy } from '../util/mori'

import type { Seq, Seqable } from 'mori'
import type { Readable } from 'stream'
import type { URI } from '../models/uri'

export type Content = {
  id?: string,
  mediaType: string,
  stream: Readable
}

export type ActivityCallback = (_: {
  activityUri: URI,
  contentUri: URI
}) => AS.Activity
export type RootCallback = (_: BuildMail) => void

type ID = string

// TODO: should `Content-ID` values be globally unique?

/* Constructing MIME tree nodes */

export function newMessage (
  {
    from,
    to,
    cc,
    conversation
  }: {
    from: Seqable<Address>,
    to: Seqable<Address>,
    cc: Seqable<Address>,
    conversation: Conversation
  },
  root: BuildMail
) {
  const refs = references(conversation)

  root.addHeader({
    from: addresses(from),
    to: addresses(to),
    cc: addresses(cc),
    subject: LV.getString(conversation.subject, ''),
    references: refs
  })
}

export function newNode (contentType: string, options: Object = {}): BuildMail {
  return new BuildMail(contentType, {
    disableFileAccess: true,
    disableUrlAccess: true,
    ...options
  })
}

export function contentNode (content: Content, options: Object = {}): BuildMail {
  const node = newNode(content.mediaType, options).setContent(content.stream)
  if (content.id) {
    node.addHeader('Content-ID', `<${content.id}>`)
  }
  return node
}

/* helpers for building message headers */

// TODO: remove references from list if necessary to keep length down (always
// keep at least first and last reference)
export function references (conversation: Conversation): string {
  return m.intoArray(m.map(id => `<${id}>`, conversation.references)).join(' ')
}

/* High-level functions for building a MIME tree */

export function buildAlternative ({
  activity,
  root,
  content,
  fallbackContent
}: {
  activity: ActivityCallback,
  root: RootCallback,
  content: Content,
  fallbackContent?: Content
}): BuildMail {
  return fallbackContent
    ? separateContentAndFallback(activity, root, content, fallbackContent)
    : contentIsFallback(activity, root, content)
}

export function buildEditAlternative ({
  activity,
  root,
  updatedActivity,
  content,
  fallbackContent
}: {
  activity: ActivityCallback,
  root: RootCallback,
  updatedActivity: Content,
  content: Content,
  fallbackContent?: Content
}): BuildMail {}

function contentIsFallback (
  f: ActivityCallback,
  root: RootCallback,
  content: Content
): BuildMail {
  const alternative = newNode('multipart/alternative')
  root(alternative) // callback sets message-level metadata
  const messageId = idFromHeaderValue(alternative.messageId())

  const activityId = 'activity'
  const contentId = 'content'
  const activity = f({
    activityUri: midUri(messageId, activityId),
    contentUri: midUri(messageId, contentId)
  })

  const contentPart = contentNode(content).setHeader('Content-ID', contentId)

  const activityPart = newNode('application/activity+json')
    .setContent(asutil.createReadStream(activity))
    .setHeader('Content-ID', activityId)

  alternative.appendChild(contentPart)
  alternative.appendChild(activityPart)

  return alternative
}

function separateContentAndFallback (
  f: ActivityCallback,
  root: RootCallback,
  content: Content,
  fallbackContent: Content
): BuildMail {
  const alternative = newNode('multipart/alternative')
  root(alternative) // callback sets message-level metadata
  const messageId = idFromHeaderValue(alternative.messageId())

  const activityId = 'activity'
  const contentId = 'content'
  const fallbackId = 'fallbackContent'
  const activity = f({
    activityUri: midUri(messageId, activityId),
    contentUri: midUri(messageId, contentId)
  })

  const fallbackPart = contentNode(fallbackContent).setHeader(
    'Content-ID',
    fallbackId
  )

  const contentPart = contentNode(content).setHeader('Content-ID', contentId)

  const activityPart = newNode('application/activity+json')
    .setContent(asutil.createReadStream(activity))
    .setHeader('Content-ID', activityId)

  const related = newNode('multipart/related')
    .appendChild(activityPart)
    .appendChild(contentPart)

  alternative.appendChild(fallbackPart).appendChild(related)

  return alternative
}

export function getUniqueId (senderEmail?: Address) {
  const host = senderEmail ? senderEmail.host : ''
  return `${uuid.v4()}@${host}`
}

/* formatting helpers */

export function addresses (addrs: Seqable<Address>): string {
  return m.intoArray(m.map(addr => addr.headerValue, addrs)).join(', ')
}

// Use a regular expression to trim angle brackets off
const messageIdPattern = /<(.*)>/
export function idFromHeaderValue (id: string): ID {
  return id.replace(messageIdPattern, (_, id) => id)
}
