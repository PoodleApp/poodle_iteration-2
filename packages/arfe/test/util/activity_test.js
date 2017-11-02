/* @flow */

import test from 'ava'

import * as AS from 'activitystrea.ms'
import streamToString from 'stream-to-string'
import * as V from 'vocabs-as'
import * as asutil from '../../src/util/activity'

function actCreate (): AS.models.Activity {
  return AS.create()
    .id('mid:foo/bar')
    .object(AS.note().name('a note').content('note content').get())
    .get()
}

test('creates an activity', t => {
  t.plan(2)
  const act = actCreate()
  t.is(act.id, 'mid:foo/bar')
  t.is(act.object.first.name.get(), 'a note')
})

test('modifies an activity', t => {
  t.plan(6)

  const orig = actCreate()
  const act = asutil.modify(a => {
    a.actor().actor([AS.object(V.Actor).id('mailto:jesse@sitr.us').get()])
  }, orig)

  t.is(
    act.actor.first.id,
    'mailto:jesse@sitr.us',
    'it should add an `actor` property'
  )
  t.truthy(act.object, 'object should be preserved')
  t.is(
    act.object.first.name.get(),
    'a note',
    'object content should be preserved'
  )

  t.falsy(orig.actor, 'original should not have been modified')
  t.truthy(orig.object, 'original should still have object')
  t.is(
    orig.object.first.name.get(),
    'a note',
    'original should still have object content'
  )
})

test('modifies an activity twice', t => {
  t.plan(2)

  const orig = actCreate()
  let act = asutil.modify(a => {
    a.to().to([AS.object(V.Actor).id('mailto:pdxjs@googlegroups.com').get()])
  }, orig)

  act = asutil.modify(a => {
    a.actor().actor([AS.object(V.Actor).id('mailto:jesse@sitr.us').get()])
  }, act)

  t.truthy(act.object, 'object should be preserved')
  t.truthy(orig.object, 'original should still have object')
})

test('emits an activity as a readable stream', async t => {
  t.plan(1)

  const act = actCreate()
  const stream = asutil.createReadStream(act)
  const string = await streamToString(stream)
  t.true(string.length >= 1)
})
