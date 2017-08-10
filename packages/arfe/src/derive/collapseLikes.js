/* @flow */

import * as m from 'mori'
import * as Vocab from 'vocabs-as'
import DerivedActivity, * as Drv from '../models/DerivedActivity'

import type { Seq, Seqable, Vector } from 'mori'
import type { Transformer } from './types'

const collapseLikes: Transformer = async (_, activities) => {
  const context = activities
  return m.mapcat(_collapseLikes.bind(null, context), activities)
}

export default collapseLikes

function _collapseLikes (
  context: Seqable<DerivedActivity>,
  activity: DerivedActivity
): Vector<DerivedActivity> {
  if (activity.hasType(Vocab.Like)) {
    return m.vector() // likes are not directly visible
  }

  const likes = m.reduce(
    (ls, otherAct) => {
      if (
        otherAct.hasType(Vocab.Like) &&
        isLikeTarget(activity, otherAct)
      ) {
        const actor = otherAct.actor
        return actor ? m.assoc(ls, actor.id, otherAct) : ls
      } else {
        return ls
      }
    },
    m.hashMap(),
    context
  )

  return m.vector(activity.set({ likes }))
}

function isLikeTarget (target: DerivedActivity, like: DerivedActivity): boolean {
  const likedObjectUris = like.objectUris
  return !!m.some(
    uri => target.hasId(uri) || target.hasObjectUri(uri),
    likedObjectUris
  )
}
