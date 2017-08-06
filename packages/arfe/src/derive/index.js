/* @flow */

import * as m            from 'mori'
import Activity          from '../models/Activity'
import DerivedActivity   from '../models/DerivedActivity'
import Message, * as Msg from '../models/Message'
import { buildThread }   from '../models/Thread'

import collapseAsides from './collapseAsides'
import collapseEdits  from './collapseEdits'
import collapseLikes  from './collapseLikes'
import insertJoins    from './insertJoins'

import type { Seqable }              from 'mori'
import type { Readable }             from 'stream'
import type { Fetcher, Transformer } from './types'

// Processed in order from first to last
const transformers: Seqable<Transformer> = [
  // collapseAsides,
  insertJoins,
  collapseEdits,
  collapseLikes,
  recursivelyDeriveAsides,
]

export default function derive(
  fetchPartContent: (msg: Message, contentId: string) => Promise<Readable>,
  activities: Seqable<Activity>,
): Promise<Seqable<DerivedActivity>> {
  const f = fetcher(fetchPartContent, activities)

  // For now `collapseAsides` is special
  const thread = buildThread(activities)
  const derivedActivities = collapseAsides(thread)

  return deriveRec(f, transformers, derivedActivities)
}

async function deriveRec(
  f: Fetcher,
  transformers: Seqable<Transformer>,
  activities: Seqable<DerivedActivity>,
): Promise<Seqable<DerivedActivity>> {
  const transformer = m.first(transformers)
  if (!transformer) {
    return activities
  }
  const transformed = await transformer(f, activities)
  return deriveRec(f, m.rest(transformers), transformed)
}

function fetcher(
  fetchPartContent: (msg: Message, contentId: string) => Promise<Readable>,
  activities: Seqable<Activity>,
): Fetcher {
  return uri => {
    const parsed = Msg.parseMidUri(uri)
    if (!parsed) {
      return Promise.reject(
        new Error(`Could not parse URI according to 'mid:' or 'cid:' scheme: ${uri}`)
      )
    }

    const { scheme, messageId, contentId } = parsed
    if (!messageId || !contentId) {
      return Promise.reject(
        new Error(`expected fully-qualified 'mid:' URI, but got: ${uri}`)
      )
    }

    const msg = m.first(
      m.filter(msg => msg && msg.id === messageId,
      m.map(act => act.message, activities)
    ))
    if (!msg) {
      return Promise.reject(
        new Error(`could not find message with matching ID in thread: ${uri}`)
      )
    }

    return fetchPartContent(msg, contentId)
  }
}

function recursivelyDeriveAsides(
  f: Fetcher,
  activities: Seqable<DerivedActivity>
): Promise<Seqable<DerivedActivity>> {
  return m.reduce(
    async (transformed, activity) => {
      const aside        = activity.aside
      const derivedAside = aside && deriveRec(f, transformers, aside)
      return m.conj(
        await transformed,
        derivedAside ? activity.set({ aside: await derivedAside }) : activity
      )
    },
    Promise.resolve(m.vector()),
    activities
  )
}
