/* @flow */

import * as m from 'mori'
import Activity from '../models/Activity'
import DerivedActivity from '../models/DerivedActivity'
import Message, * as Msg from '../models/Message'
import * as P from '../models/MessagePart'
import { buildThread } from '../models/Thread'

import collapseAsides from './collapseAsides'
import collapseEdits from './collapseEdits'
import collapseLikes from './collapseLikes'
import insertJoins from './insertJoins'

import type { Seqable } from 'mori'
import type { Readable } from 'stream'
import type { Fetcher, Transformer } from './types'

// Processed in order from first to last
const transformers: Seqable<Transformer> = [
  // collapseAsides,
  insertJoins,
  collapseEdits,
  collapseLikes,
  recursivelyDeriveAsides
]

export default function derive (
  fetchPartContent: (msg: Message, P.PartRef) => Promise<Readable>,
  activities: Seqable<Activity>
): Promise<Seqable<DerivedActivity>> {
  const f = fetcher(fetchPartContent, activities)

  // For now `collapseAsides` is special
  const thread = buildThread(activities)
  const derivedActivities = collapseAsides(thread)

  return deriveRec(f, transformers, derivedActivities)
}

async function deriveRec (
  f: Fetcher,
  transformers: Seqable<Transformer>,
  activities: Seqable<DerivedActivity>
): Promise<Seqable<DerivedActivity>> {
  const transformer = m.first(transformers)
  if (!transformer) {
    return activities
  }
  const transformed = await transformer(f, activities)
  return deriveRec(f, m.rest(transformers), transformed)
}

function fetcher (
  fetchPartContent: (msg: Message, P.PartRef) => Promise<Readable>,
  activities: Seqable<Activity>
): Fetcher {
  return uri => {
    const parsed = Msg.parseMidUri(uri)
    if (!parsed) {
      return Promise.reject(
        new Error(
          `Could not parse URI according to 'mid:' or 'cid:' scheme: ${uri}`
        )
      )
    }

    const { scheme, messageId, contentId } = parsed
    if (!messageId || !contentId) {
      return Promise.reject(
        new Error(`expected fully-qualified 'mid:' URI, but got: ${uri}`)
      )
    }

    const msg = m.first(
      m.filter(
        msg => msg && msg.id === messageId,
        m.map(act => act.message, activities)
      )
    )
    if (!msg) {
      return Promise.reject(
        new Error(`could not find message with matching ID in thread: ${uri}`)
      )
    }

    // Some message parts do not have content IDs. (content IDs are explicit
    // headers on parts, part IDs are assigned to content parts in order when
    // parsing a message). In cases with no content ID we fall back to part IDs
    // for `mid:` URIs (in contradiction of RFC-2392). Unfortunately that means
    // that when we parse a `mid` URI we do not know whether the result is
    // a content ID or a part ID. The ambiguous ID type encodes a ref for those
    // cases. In general an ambiguous ID will result in a lookup by content ID
    // first, and then by part ID in case the content ID lookup fails.
    return fetchPartContent(msg, P.ambiguousId(contentId))
  }
}

function recursivelyDeriveAsides (
  f: Fetcher,
  activities: Seqable<DerivedActivity>
): Promise<Seqable<DerivedActivity>> {
  return m.reduce(
    async (transformed, activity) => {
      const aside = activity.aside
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
