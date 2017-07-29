/* @flow */

import * as AS  from 'activitystrea.ms'
import * as m   from 'mori'
import describe from 'tape'

import DerivedActivity, {
  newSyntheticActivity,
  syntheticTypes,
} from '../../src/models/DerivedActivity'

describe('DerivedActivity', ({ test }) => {

  test('assigns id to synthetic activities', t => {
    t.plan(2)
    const act = AS.activity(syntheticTypes.Aside).get()
    const drv = newSyntheticActivity(act)
    t.ok(typeof drv.id === 'string', 'synthetic activity has an id')
    t.ok(drv.isSynthetic, 'synthetic activity is synthetic')
  })

  test('returns empty map for activities that no one likes', t => {
    t.plan(2)
    const act = AS.create().get()
    const drv = newSyntheticActivity(act)
    t.ok(!!drv.likes, 'activity has a `likes` map')
    t.equal(m.count(drv.likes), 0, 'no one likes this activity')
  })

})
