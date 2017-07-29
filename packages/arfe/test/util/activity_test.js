/* @flow */

import describe from 'tape'

import * as AS     from 'activitystrea.ms'
import * as V      from 'vocabs-as'
import * as asutil from '../../src/util/activity'

function actCreate(): AS.models.Activity {
  return AS
    .create()
    .id('mid:foo/bar')
    .object(
      AS
      .note()
      .name("a note")
      .content("note content")
      .get()
    )
    .get()
}

describe('util/activity', ({ test }) => {

  test('creates an activity', t => {
    t.plan(2)
    const act = actCreate()
    t.equal(act.id, 'mid:foo/bar')
    t.equal(act.object.first.name.get(), 'a note')
  })

  test('modifies an activity', t => {
    t.plan(6)

    const orig = actCreate()
    const act = asutil.modify(a => {
      a.actor().actor([
        AS.object(V.Actor).id('mailto:jesse@sitr.us').get()
      ])
    }, orig)

    t.equal(act.actor.first.id, 'mailto:jesse@sitr.us', 'it should add an `actor` property')
    t.ok(!!act.object, 'object should be preserved')
    t.equal(act.object.first.name.get(), 'a note', 'object content should be preserved')

    t.ok(!orig.actor, 'original should not have been modified')
    t.ok(!!orig.object, 'original should still have object')
    t.equal(orig.object.first.name.get(), 'a note', 'original should still have object content')
  })

  test('modifies an activity twice', t => {
    t.plan(2)

    const orig = actCreate()
    let act = asutil.modify(a => {
      a.to().to([
        AS.object(V.Actor).id('mailto:pdxjs@googlegroups.com').get()
      ])
    }, orig)

    act = asutil.modify(a => {
      a.actor().actor([
        AS.object(V.Actor).id('mailto:jesse@sitr.us').get()
      ])
    }, act)

    t.ok(!!act.object, 'object should be preserved')
    t.ok(!!orig.object, 'original should still have object')
  })

})
