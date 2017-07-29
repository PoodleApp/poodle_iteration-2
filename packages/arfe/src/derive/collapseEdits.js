/* @flow */

import * as AS                   from 'activitystrea.ms'
import * as m                    from 'mori'
import * as Vocab                from 'vocabs-as'
import * as Act                  from '../models/Activity'
import DerivedActivity, * as Drv from '../models/DerivedActivity'
import * as asutil               from '../util/activity'

import type { Seq, Seqable, Vector } from 'mori'
import type { Fetcher, Transformer } from './types'

const collapseEdits: Transformer = async (fetcher, activities) => {
  const context = m.sortBy(act => act.publishTime, activities)
  const updated = await Promise.all(m.intoArray(
    m.map(collapse.bind(null, fetcher, context), activities)
  ))
  return m.flatten(updated)
}

export default collapseEdits

async function collapse(
  fetcher: Fetcher,
  context: Seqable<DerivedActivity>,
  activity: DerivedActivity
): Promise<Vector<DerivedActivity>> {
  // Update activities will not be displayed directly. Instead they modify other
  // activities in the stream.
  if (activity.hasType(Vocab.Update)) {
    return m.vector()
  }

  // TODO: think about a robust algorithm for determining which update wins

  const editResults = m.reduce(async (accum, otherAct) => {
    const [revisions, conflicts] = await accum
    const orig                   = m.first(revisions)  // latest revision is at the front of the list
    const updatedUri             = otherAct.objectUri
    if (otherAct.hasType(Vocab.Update) && updatedUri && Drv.canEdit(orig, otherAct)) {
      const idx = m.first(
        m.keepIndexed((i, act) => act.id === updatedUri ? i : undefined, revisions)
      )
      if (idx === 0) {  // `otherAct` is an update to `orig`
        try {
          const updated = await resolveUpdate(fetcher, otherAct, orig)
          return [m.conj(revisions, updated), conflicts]
        }
        catch(err) {
          // TODO: For now we handle invalid `Update` activities by ignoring
          // them. In the future it might be useful to have a "failed edit"
          // activity type, or to accumulate errors to send to the UI.
          console.error('Failed to apply an `Update`', err, otherAct)
          return [revisions, conflicts]
        }
      }
      else if (idx >= 1) {  // `otherAct` is an update to `orig`, but an earlier update won
        return [revisions, m.conj(conflicts, Drv.newConflict(otherAct))]
      }
      else {  // `otherAct` is an update to some other activity
        return [revisions, conflicts]
      }
    }
    return [revisions, conflicts]
  }
    , Promise.resolve([m.list(activity), m.vector()])
    , context
  )
  // `conj` puts items on the front of a list, and at the end of a vector.

  const [revisions, conflicts] = await editResults
  const latestRevision = m.first(revisions)
  return m.conj(conflicts, latestRevision)
}

// Merge properties from `update` into `orig`. For now these are the only
// changes that may be made:
//
// - the updated activity has the `id` of the update, not of the original activity
// - the updated activity gets an `updated` timestamp
// - the update's `object` replaces the original `object`
//
// only `object` may be
// changed.
async function resolveUpdate(
  fetcher: Fetcher,
  update: DerivedActivity,
  orig: DerivedActivity
): Promise<DerivedActivity> {
  const msg       = update.message
  const resultUri = update.resultUri
  if (!resultUri) {
    return Promise.reject(new Error("update does not have a `result` link"))
  }
  if (!msg) {
    return Promise.reject(new Error("update must have message context"))
  }

  const resultStream = await fetcher(resultUri)
  const result       = await Act.importActivity(msg, resultStream)

  const updated = asutil.modify(act => {
    act.id(resultUri)
    if (result.publishTime) {
      act.updated(result.publishTime.toDate())
    }
    if (result.objects && result.objects.length > 0) {
      act.object().object(result.objects)
    }
  }, orig.activity.activity)

  return orig.revise(updated, update)
}
