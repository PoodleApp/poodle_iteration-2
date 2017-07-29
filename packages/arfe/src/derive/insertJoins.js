/* @flow */

import * as AS                       from 'activitystrea.ms'
import * as m                        from 'mori'
import * as Act                      from '../models/Activity'
import * as Addr                     from '../models/Address'
import DerivedActivity, * as Drv     from '../models/DerivedActivity'
import { catMaybes, maybeToSeqable } from '../util/maybe'

import type { Seq, Seqable, Vector } from 'mori'
import type { Transformer }          from './types'

const insertJoins: Transformer = async (_, activities) => {
  const context = m.sortBy(act => act.publishTime, activities)
  return m.mapcat(_insertJoins.bind(null, context), activities)
}

export default insertJoins

function _insertJoins(
  context:  Seqable<DerivedActivity>,
  activity: DerivedActivity
): Vector<DerivedActivity> {
  const prev  = m.takeWhile(a => a.id !== activity.id, context)
  const ppl   = Act.flatParticipants(m.map(a => a.activity, prev))
  const added = m.filter(
    p => !m.some(Addr.equals.bind(null, p), ppl),
    Act.flatParticipants(maybeToSeqable(activity.original))
  )

  if (m.isEmpty(added) || m.isEmpty(prev)) {
    return m.vector(activity)
  }
  else if (m.every(p => {
    const a = activity.actor
    return a && (p.uri === a.uri)
  }, added)) {
    return m.vector(activity)
  }

  const addedActs = m.map(p => Drv.newSyntheticActivity(
    AS.activity(Drv.syntheticTypes.Join),
    activity.original ? { original: activity.original } : {}
  ), added)
  return m.conj(m.into(m.vector(), addedActs), activity)
}
