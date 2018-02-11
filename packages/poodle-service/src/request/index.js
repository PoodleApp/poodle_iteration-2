/* @flow */

import { type Headers } from 'arfe/lib/models/Message'
import * as imap from 'imap'
import type Connection from 'imap'
import * as kefir from 'kefir'
import { simpleParser } from 'mailparser'
import { type Readable } from 'stream'
import { decode } from '../encoding'
import { mapToJson } from '../util/native'
import * as kefirUtil from '../util/kefir'
import * as promises from '../util/promises'
import * as actions from './actions'
import alignState from './alignState'
import * as state from './state'
import { type BoxSpecifier } from './types'

export * from './state'
export * from './types'

export function perform<T> (
  action: actions.Action<T>,
  expectedState: state.ConnectionState,
  connection: Connection
): kefir.Observable<T, Error> {
  return kefir
    .fromPromise(alignState(expectedState, connection))
    .flatMap(() => _perform(action, connection))
}

// TODO:
// execute: (action, state, conn) => Promise<value>

// Perform task *after* connection state has been adjusted to meet expectations
// of the given action.
function _perform (
  action: actions.Action<any>,
  connection: Connection
): kefir.Observable<any, Error> {
  switch (action.type) {
    case actions.END:
      connection.end()
      return kefir.constant(undefined)
    case actions.FETCH_BODY:
      const encoding = action.encoding
      return kefirUtil
        .fromEventsWithEnd(
          connection.fetch(action.source, action.options),
          'message',
          (msg, seqno) => msg
        )
        .flatMap(msg => messageBodyStream(msg))
        .take(1)
        .map(body => (encoding ? decode(encoding, body) : body))
        .flatMap(body => kefirUtil.fromReadable(body))
    case actions.FETCH_ATTRIBUTES:
      return fetchAttributes(action.source, action.options, connection)
    case actions.FETCH_ATTRIBUTES_AND_HEADERS:
      return fetchAttributesAndHeaders(
        action.source,
        action.options,
        connection
      )
    case actions.GET_BOX:
      return kefir.constant((connection: any)._box)
    case actions.GET_BOXES:
      const nsPrefix = action.nsPrefix
      return kefir.fromNodeCallback(
        cb =>
          nsPrefix ? connection.getBoxes(nsPrefix, cb) : connection.getBoxes(cb)
      )
    case actions.GET_CAPABILITIES:
      return kefir.constant(connection._caps || [])
    case actions.SEARCH:
      const criteria = action.criteria
      return kefir.fromNodeCallback(cb => connection.search(criteria, cb))
    default:
      return kefir.constantError(
        new Error(`unknown request type: ${action.type}`)
      )
  }
}

function fetchAttributes (
  source: imap.MessageSource,
  options: imap.FetchOptions,
  connection: Connection
): kefir.Observable<imap.MessageAttributes> {
  return kefirUtil
    .fromEventsWithEnd(
      connection.fetch(source, options),
      'message',
      (msg, seqno) => msg
    )
    .flatMap(getAttributes)
}

function fetchAttributesAndHeaders (
  source: imap.MessageSource,
  options: imap.FetchOptions,
  connection: Connection
): kefir.Observable<{
  attributes: imap.MessageAttributes,
  headers: actions.SerializedHeaders
}> {
  if (!bodiesIncludes(headersSelection, options)) {
    return kefir.constantError(
      new Error(
        `Cannot fetch message headers unless fetch options include '${headersSelection}' body`
      )
    )
  }
  return kefirUtil
    .fromEventsWithEnd(
      connection.fetch(source, options),
      'message',
      (msg, seqno) => msg
    )
    .flatMap((imapMsg: imap.ImapMessage) => {
      const attrStream = getAttributes(imapMsg)
      const headersStream = getHeaders(imapMsg)
      return kefir.zip([attrStream, headersStream], (attributes, headers) => ({
        attributes,
        headers: mapToJson(headers)
      }))
    })
}

// TODO: this might come in multiple chunks
function messageBodyStream (
  msg: imap.ImapMessage
): kefir.Observable<Readable, Error> {
  return kefirUtil.fromEventsWithEnd(msg, 'body', (stream, info) => stream)
}

function getAttributes (
  message: imap.ImapMessage
): kefir.Observable<imap.MessageAttributes, Error> {
  return kefirUtil.fromEventsWithEnd(message, 'attributes')
}

const headersSelection = 'HEADER'

function getHeaders (
  message: imap.ImapMessage
): kefir.Observable<Headers, Error> {
  const bodies = kefirUtil.fromEventsWithEnd(
    message,
    'body',
    (stream, info) => [stream, info]
  )
  return bodies.flatMap(([stream, info]) => {
    if (info.which !== headersSelection) {
      return kefir.never()
    }
    return kefirUtil.collectData(stream).flatMap(data => {
      const headers = simpleParser(data).then(mail => mail.headers)
      return kefir.fromPromise(headers)
    })
  })
}

function bodiesIncludes (body: string, options: imap.FetchOptions): boolean {
  const bodies = options.bodies
  if (!bodies) {
    return false
  } else if (typeof bodies === 'string') {
    return bodies === body
  } else {
    return bodies.includes(body)
  }
}
