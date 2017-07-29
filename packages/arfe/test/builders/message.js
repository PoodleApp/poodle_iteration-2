/*
 * Utilities to build email messages for testing
 *
 * @flow
 */

import * as AS       from 'activitystrea.ms'
import * as m        from 'mori'
import * as uuid     from 'node-uuid'
import stream        from 'string-to-stream'
import Address       from '../../src/models/Address'
import Message       from '../../src/models/Message'
import { catMaybes } from '../../src/util/maybe'

import type {
  Address as ImapAddress,
  MessageAttributes,
  MessagePart,
  MessageStruct,
}                           from 'imap'
import type { Seq, Vector } from 'mori'
import type { Readable }    from 'stream'
import type { MessageId }   from '../../src/models/Message'

type MessageParams = {
  activity?:   Object,
  bcc?:        Address[],
  cc?:         Address[],
  from?:       Address[],
  html?:       string,
  inReplyTo?:  MessageId,
  messageId?:  MessageId,
  references?: ?MessageId[],
  revision?:   Object,
  subject?:    string,
  text?:       string,
  to?:         Address[],
}

export const participants = {
  Merrilee: new Address({ name: 'Merrilee Mahaney', mailbox: 'merrilee', host: 'or.ca'}),
  Reiko:    new Address({ name: 'Reiko Ballin',     mailbox: 'rmballin', host: 'gmail.com'}),
  Melba:    new Address({ name: 'Melba Philips',    mailbox: 'melba',    host: 'startsmart.com'}),
  Loraine:  new Address({ name: 'Loraine Osier',    mailbox: 'loraine',  host: 'startsmart.com'}),
  Joseph:   new Address({ name: 'Joseph Toscano',   mailbox: 'joseph',   host: 'justjoseph.com'}),
}

const defaultFrom = [participants.Merrilee]
const defaultTo   = [participants.Reiko]

export type FetchPartContent = (msg: Message, partId: string) => Promise<Readable>

export function newThread(params: MessageParams[]): [Seq<Message>, FetchPartContent] {
  const withRefs = m.map(addReferences.bind(null, params), params)
  const pairs    = m.map(newMessage, withRefs)
  const msgs     = m.map(([msg, _]) => msg, pairs)
  return [msgs, fetchPartContent]

  function fetchPartContent(msg: Message, partId: string): Promise<Readable> {
    const match = m.first(m.filter(([m, _]) => m.id === msg.id, pairs))
    if (match) {
      const [_, f] = match
      return f(msg, partId)
    }
    else {
      return Promise.reject(
        new Error(`Could not locate part content for message: ${msg.id}`)
      )
    }
  }
}

export function newMessage(params: MessageParams): [Message, FetchPartContent] {
  const messageId = params.messageId || randomMessageId()
  const date      = new Date()
  const from      = unwrapAddresses(params.from || defaultFrom)
  const [struct, fetchPartContent] = buildStruct(messageId, params)
  const message = {
    uid:   randomUid(),
    flags: [],
    date,
    struct,
    envelope: {
      date: date.toISOString(),
      subject: params.subject || 'Re:',
      from,
      sender: from,
      replyTo: [],
      to: unwrapAddresses(params.to || defaultTo),
      cc: unwrapAddresses(params.cc || []),
      bcc: unwrapAddresses(params.bcc || []),
      inReplyTo: params.inReplyTo ? angleBrackets(params.inReplyTo) : null,
      messageId: angleBrackets(messageId),
    },
    size: 9000,
  }
  const headers = new Map
  if (params.references) {
    headers.set('references', params.references.map(angleBrackets))
  }
  return [new Message(message, headers), fetchPartContent]
}

function addReferences(context: MessageParams[], params: MessageParams): MessageParams {
  const refs = getReferences(context, params)
  if (!m.isEmpty(refs)) {
    return {
      ...params,
      references: m.intoArray(refs)
    }
  }
  else {
    return params
  }
}

function getReferences(context: MessageParams[], params: MessageParams): Vector<MessageId> {
  if (!params.inReplyTo) {
    return m.vector()
  }

  const prev = m.first(m.filter(p => p.messageId === params.inReplyTo, context))
  if (!prev) {
    throw new Error(`Found a reference that does not match up with any message: ${String(params.inReplyTo)}`)
  }

  const prevId = prev.messageId
  if (!prevId) { return m.vector() }

  return m.conj(getReferences(context, prev), prevId)
}

function randomUid(): number {
  return Math.round(Math.random() * 10000)
}

export function randomMessageId(): string {
  return `${uuid.v4()}@sitr.us`
}

function unwrapAddresses(addrs: Address[]): ImapAddress[] {
  return addrs.map(unwrapAddress)
}

function unwrapAddress({ name, mailbox, host }: Address): ImapAddress {
  return name
    ? { name, mailbox, host }
    : { mailbox, host }
}

function buildStruct(messageId: MessageId, params: MessageParams): [MessageStruct, FetchPartContent] {
  const parts = catMaybes([
    buildContentPart('text', 'text', 'plain', params.text),
    buildContentPart('html', 'text', 'html',  params.html),
    buildActivityParts(params),
  ])
  const struct = [{
    partID: 'alternative',
    type: 'alternative',
    params: {},
  }, ...m.intoArray(parts)]

  return [struct, fetchPartContent]

  function fetchPartContent(msg: Message, partId: string): Promise<Readable> {
    function toStream(content: ?string): Promise<Readable> {
      if (content) {
        return Promise.resolve(stream(content))
      }
      else {
        return Promise.reject(
          new Error(`no content for ${msg.uriForPartId(partId)}`)
        )
      }
    }

    if (msg.id !== messageId) {
      return Promise.reject(
        new Error(`this fetchPartContent implementation does not apply to message ID: ${msg.id}`)
      )
    }

    switch(partId) {
      case 'text':     return toStream(params.text)
      case 'html':     return toStream(params.html)
      case 'activity': return toStream(params.activity && JSON.stringify(params.activity))
      case 'revision': return toStream(params.revision && JSON.stringify(params.revision))
      default:         return toStream(null)
    }
  }
}

function buildContentPart(partID: string, type: string, subtype: string, content: ?string): ?MessageStruct {
  if (!content) { return }
  return [{
    partID,
    type,
    subtype,
    params: {},
  }]
}

function buildActivityParts(params: MessageParams): ?MessageStruct {
  const activityPart = params.activity
    && buildContentPart('activity', 'application', 'activity+json', JSON.stringify(params.activity))
  const revisionPart = params.revision
    && buildContentPart('revision', 'application', 'activity+json', JSON.stringify(params.revision))
  if (activityPart && revisionPart) {
    return [
      { type: 'related', params: {} },
      activityPart,
      revisionPart,
    ]
  }
  else if (params.activity) {
    return activityPart
  }
}

function angleBrackets(str: string): string {
  return `<${str}>`
}
