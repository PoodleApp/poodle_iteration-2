/* @flow */

import * as m                    from 'mori'
import * as Vocab                from 'vocabs-as'
import DerivedActivity, * as Drv from '../models/DerivedActivity'

import type { Seq, Seqable, Vector } from 'mori'
import type { Transformer }          from './types'

const collapseLikes: Transformer = async (_, activities) => {
  const context = activities
  return m.mapcat(_collapseLikes.bind(null, context), activities)
}

export default collapseLikes

function _collapseLikes(
  context: Seqable<DerivedActivity>,
  activity: DerivedActivity
): Vector<DerivedActivity> {
  if (activity.hasType(Vocab.Like)) {
    return m.vector()  // likes are not directly visible
  }

  const likes = m.reduce((ls, otherAct) => {
    const objectUris = otherAct.objectUris
    if (otherAct.hasType(Vocab.Like) && m.some(uri => activity.hasId(uri), objectUris)) {
      const actor = otherAct.actor
      return actor ? m.assoc(ls, actor.uri, otherAct) : ls
    }
    else {
      return ls
    }
  }
  , m.hashMap(), context)

  return m.vector(activity.set({ likes }))
}
