/* @flow */

import test from 'ava'
import * as m from 'mori'
import * as F from '../fixtures/messages'

import Message from '../../src/models/Message'

const msg = new Message(F.multipartAlternative, new Map())

test('extracts message ID from headers', t => {
  t.plan(1)
  t.is(
    msg.id,
    'CAGM-pNuNmZ9tS1-4CA9s0Sb=dGSdi3w51NghoubSkqt5bUP6iA@mail.gmail.com'
  )
})

test('extracts HTML part from a message', t => {
  t.plan(3)

  const htmlParts = msg.htmlParts
  t.is(m.count(htmlParts), 1)

  const part = m.first(htmlParts)
  t.true(typeof part.partID === 'string', '`partID` should be a string')
  t.true(!!part.partID, '`partID` should not be empty')
})

test('extracts text part from a message', t => {
  t.plan(3)

  const textParts = msg.textParts
  t.is(m.count(textParts), 1)

  const part = m.first(textParts)
  t.true(typeof part.partID === 'string', '`partID` is a string')
  t.true(!!part.partID, '`partID` is not empty')
})

test('extracts both html and text parts from a message', t => {
  t.plan(3)

  const contentParts = msg.allContentParts
  t.is(m.count(contentParts), 2)
  t.true(
    m.some(part => part.subtype === 'html', contentParts),
    'got an html part'
  )
  t.true(
    m.some(part => part.subtype === 'plain', contentParts),
    'got a plain text part'
  )
})

test('gets a message part by part ID', t => {
  t.plan(2)

  const part = msg.getPart({ partId: '2' })
  t.truthy(part, 'found html part')
  if (!part) {
    throw new Error('Expected an HTML part')
  }

  t.is(part.subtype, 'html', 'part is an html part')
})

test('resolves relative `cid:` URIs', t => {
  t.plan(1)
  const uri = msg.resolveUri('cid:2')
  t.is(
    uri,
    `mid:${encodeURIComponent(
      'CAGM-pNuNmZ9tS1-4CA9s0Sb=dGSdi3w51NghoubSkqt5bUP6iA@mail.gmail.com'
    )}/2`
  )
})

test('returns not `cid:` strings unmodified', t => {
  t.plan(1)
  const notAUri = 'foo/bar'
  const resolved = msg.resolveUri(notAUri)
  t.is(resolved, notAUri)
})
