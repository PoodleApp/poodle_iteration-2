/* @flow strict */

import * as AS from 'activitystrea.ms'
import type { Disposition, MessagePart, MessageStruct } from 'imap'
import * as m from 'mori'
import Address from '../models/Address'
import * as LV from '../models/LanguageValue'
import Message from '../models/Message'
import { type URI, midUri } from '../models/uri'
import State from '../util/State'
import * as compose from './helpers'
import * as Struct from './struct'
import { type Content, type ID, type MessageParams } from './types'

export type BuilderState = {
  messageId?: ID,
  sender: Address,
  contentMap: m.Map<ID, Content>,
  partMap: m.Map<ID, MessagePart>,
  primaryParts: m.Vector<ID>,
  relatedParts: m.Vector<ID>,
  attachments: m.Vector<ID>
}

export type Builder<A> = State<A, BuilderState>

// `contentMap` is a map from `Content-ID` to `Content` values
export async function build (
  builder: Builder<Message>,
  sender: Address
): Promise<{ message: Message, contentMap: m.Map<ID, Content> }> {
  const initState = {
    sender,
    contentMap: m.hashMap(),
    partMap: m.hashMap(),
    primaryParts: m.vector(),
    relatedParts: m.vector(),
    attachments: m.vector()
  }
  const { value, state } = await builder.run(initState)
  return { message: value, contentMap: state.contentMap }
}

export function getContentId (): Builder<ID> {
  return State.getState().map(state => compose.getUniqueId(state.sender))
}

export function primaryContent (
  content: Content
): Builder<{ id: ID, uri: URI }> {
  return contentPart(content).flatMap(({ id, uri }) =>
    addPrimaryPart(id).map(() => ({ id, uri }))
  )
}

export function primaryActivity (
  f: (activityUri: URI) => AS.models.Activity
): Builder<{ id: ID, uri: URI }> {
  return activityPart(f).flatMap(({ id, uri }) =>
    addPrimaryPart(id).map(() => ({ id, uri }))
  )
}

export function relatedContent (
  content: Content
): Builder<{ id: ID, uri: URI }> {
  return contentPart(content).flatMap(({ id, uri }) =>
    addRelatedPart(id).map(() => ({ id, uri }))
  )
}

export function relatedActivity (
  f: (activityUri: URI) => AS.models.Activity
): Builder<{ id: ID, uri: URI }> {
  return activityPart(f).flatMap(({ id, uri }) =>
    addRelatedPart(id).map(() => ({ id, uri }))
  )
}

export function attachment (content: Content): Builder<{ id: ID, uri: URI }> {
  return contentPart(content).flatMap(({ id, uri }) =>
    addAttachment(id).map(() => ({ id, uri }))
  )
}

export function activityPart (
  f: (activityUri: URI) => AS.models.Activity
): Builder<{ id: ID, uri: URI }> {
  return getContentId().flatMap(id =>
    uriForPart(id)
      .flatMap(uri => {
        const activity = f(uri)
        const content = compose.buildActivityContent(activity)
        const part = compose.buildContentPart({ content, id })
        return State.modifyState(state => ({
          ...state,
          contentMap: m.assoc(state.contentMap, id, content),
          partMap: m.assoc(state.partMap, id, part)
        }))
      })
      .flatMap(() => uriForPart(id))
      .map(uri => ({ id, uri }))
  )
}

export function contentPart (
  content: Content,
  disposition?: Disposition
): Builder<{ id: ID, uri: URI }> {
  return getContentId().flatMap(id => {
    const part = compose.buildContentPart({ content, id, disposition })
    return State.modifyState(state => ({
      ...state,
      contentMap: m.assoc(state.contentMap, id, content),
      partMap: m.assoc(state.partMap, id, part)
    }))
      .flatMap(() => uriForPart(id))
      .map(uri => ({ id, uri }))
  })
}

/*
 * Given an array of `Content`, add a related part to the message for each input
 * element. (Input may be `undefined`)
 */
export function relatedParts (input: ?(Content[])): Builder<void> {
  return input
    ? State.sequence_(input.map(relatedContent))
    : State.result(undefined)
}

/*
 * Given an array of `Content`, add an attachment part to the message for each
 * input element. (Input may be `undefined`)
 */
export function attachments (input: ?(Content[])): Builder<void> {
  return input
    ? State.sequence_(input.map(attachment))
    : State.result(undefined)
}

function addPrimaryPart (id: ID): Builder<void> {
  return State.modifyState(state => ({
    ...state,
    primaryParts: m.conj(state.primaryParts, id)
  }))
}

function addRelatedPart (id: ID): Builder<void> {
  return State.modifyState(state => ({
    ...state,
    relatedParts: m.conj(state.relatedParts, id)
  }))
}

function addAttachment (id: ID): Builder<void> {
  return State.modifyState(state => ({
    ...state,
    attachments: m.conj(state.attachments, id)
  }))
}

export function getPart (id: ID): Builder<MessagePart> {
  return State.getState().flatMap(state => {
    const part = m.get(state.partMap, id)
    return part
      ? State.result(part)
      : State.error(new Error(`No part with ID ${id}`))
  })
}

export function result<A> (value: A): Builder<A> {
  return State.result(value)
}

export function error<A> (error: Error): Builder<A> {
  return State.error(error)
}

export function message ({
  from,
  to,
  cc,
  bcc,
  conversation,
  ...params
}: MessageParams): Builder<Message> {
  const date = params.date || new Date()
  const refs = conversation && conversation.references
  const inReplyTo = refs && m.last(refs)
  const subject =
    params.subject || (conversation ? LV.getString(conversation.subject) : '')

  return messageId().then(id => {
    const idHeader = compose.idToHeaderValue(id)

    const envelope = {
      date: date.toISOString(),
      subject,
      from: compose.envelopeAddresses(from),
      to: compose.envelopeAddresses(to),
      cc: cc ? compose.envelopeAddresses(cc) : [],
      bcc: bcc ? compose.envelopeAddresses(bcc) : [],
      sender: compose.envelopeAddresses(from),
      replyTo: compose.envelopeAddresses(from),
      inReplyTo,
      messageId: idHeader
    }

    const headers = new Map([
      ['message-id', idHeader],
      ['date', date.toISOString()],
      ['from', compose.headerAddresses(from)],
      ['to', compose.headerAddresses(to)]
    ])
    ;[
      ['cc', cc],
      ['bcc', bcc],
      ['references', refs && compose.idsToHeaderValue(refs)],
      ['in-reply-to', inReplyTo && compose.idToHeaderValue(inReplyTo)],
      ['subject', subject]
    ].forEach(([key, value]) => {
      if (value) {
        headers.set(key, value)
      }
    })

    return struct().then(s => {
      const attributes = {
        uid: 0,
        flags: [],
        date,
        struct: s,
        envelope
      }

      return new Message(attributes, headers)
    })
  })
}

export function messageId (): Builder<ID> {
  return State.getState().flatMap(state => {
    const messageId = state.messageId || compose.getUniqueId(state.sender)
    return state.messageId
      ? State.result(messageId)
      : State.putState({ ...state, messageId }).map(() => messageId)
  })
}

export function struct (): Builder<MessageStruct> {
  return State.getState().then(state => {
    const hydrateParts = ids =>
      m.intoArray(
        m.map(id => {
          const part = m.get(state.partMap, id)
          if (!part) {
            throw new Error(`Lost track of message part ${id}`)
          }
          return part
        }, ids)
      )
    return Struct.buildStruct({
      alternatives: hydrateParts(state.primaryParts),
      attachments: hydrateParts(state.attachments),
      related: hydrateParts(state.relatedParts)
    })
  })
}

export function uriForPart (id: ID): Builder<URI> {
  return messageId().map(msgId => midUri(msgId, id))
}
