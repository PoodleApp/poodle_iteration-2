/* @flow */

import * as AS from 'activitystrea.ms'
import test from 'ava'
import * as m from 'mori'

import DerivedActivity, {
  newSyntheticActivity,
  syntheticTypes
} from '../../src/models/DerivedActivity'

test('assigns id to synthetic activities', t => {
  t.plan(2)
  const act = AS.activity(syntheticTypes.Aside).get()
  const drv = newSyntheticActivity(act)
  t.true(typeof drv.id === 'string', 'synthetic activity has an id')
  t.true(drv.isSynthetic, 'synthetic activity is synthetic')
})

test('returns empty map for activities that no one likes', t => {
  t.plan(2)
  const act = AS.create().get()
  const drv = newSyntheticActivity(act)
  t.true(!!drv.likes, 'activity has a `likes` map')
  t.is(m.count(drv.likes), 0, 'no one likes this activity')
})
