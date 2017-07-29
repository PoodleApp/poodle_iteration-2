/* @flow */

import * as AS                   from 'activitystrea.ms'
import * as m                    from 'mori'
import Activity,        * as Act from '../models/Activity'
import DerivedActivity, * as Drv from '../models/DerivedActivity'
import { subtract }              from '../util/mori'

import type { Seq, Seqable, Set } from 'mori'
import type { Thread }            from '../models/Thread'

export default function collapseAsides(thread: Thread): Seq<DerivedActivity> {
  return m.mapcat(flatten.bind(null, m.set()), thread)
}

function flatten(
  ppl:              Set<string>,
  [activity, rest]: [Activity, Thread]
): Seqable<DerivedActivity> {
  const to = m.set(m.map(
    addr => addr.email,
    Act.flatParticipants(m.list(activity))
  ))
  const ppl_    = m.union(ppl, to)
  const removed = subtract(ppl, to)

  const replies = !m.isEmpty(removed)
    ? m.mapcat(flatten.bind(null, to),               rest)
    : m.mapcat(flatten.bind(null, m.union(ppl, to)), rest)
  const withReplies = m.cons(Drv.fromActivity(activity), replies)

  if (!m.isEmpty(removed)) {
    return m.seq([Drv.newAside(withReplies)])
  }
  else {
    return withReplies
  }
}
