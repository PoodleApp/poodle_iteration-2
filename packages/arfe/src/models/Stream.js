/* @flow */

import * as m                    from 'mori'
import Activity                  from './Activity'
import DerivedActivity, * as Drv from './DerivedActivity'
import Conversation              from './Conversation'
import { butLast }               from '../util/mori'

import type { Seqable, Vector } from 'mori'
import type { URI }             from './uri'

type Presentation = [Activity, Conversation]

export function activityStream(user: ?URI, convs: Seqable<Conversation>): Vector<[Vector<Activity>, Conversation]> {
  const activities = m.reverse(
                     m.sortBy(([act, _]) => act.publishTime,
                     m.mapcat(conversationActivities.bind(null, user),
                     convs)))
  return rollup(user, activities)
}

function conversationActivities(user: ?URI, conv: Conversation): Seqable<Presentation> {
  const conflicts = conv.reduce((cs, act) => (
    act.hasType(Drv.syntheticTypes.Conflict) ? m.conj(cs, act.activity) : cs
  ), m.vector())

  const activities = m.map(act => [act, conv],
         m.concat(conflicts,
         m.filter(act => true,  // TODO: cut off activities past certain age
         conv.allActivities)))

  return activities
}

function rollup(user: ?URI, activities: Seqable<Presentation>): Vector<[Vector<Activity>, Conversation]> {
  return m.reduce((as, [act, conv]) => {
    const last = m.last(as)
    if (last) {
      const [acts, conv_] = last
      if (conv === conv_) {
        return m.conj(butLast(as), [m.conj(acts, act), conv])
      }
    }
    return m.conj(as, [m.vector(act), conv])
  }, m.vector(), activities)
}
