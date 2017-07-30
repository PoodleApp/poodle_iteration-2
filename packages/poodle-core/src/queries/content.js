/* @flow */

import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import * as kefir from 'kefir'
import * as m from 'mori'
import Sync from 'poodle-service/lib/sync'
import toString from 'stream-to-string'

export type Content = {
  content: string,
  mediaType: string
}

export async function fetchContentSnippet (
  sync: Sync,
  activity: DerivedActivity,
  length: number = 100
): Promise<?string> {
  try {
    const result = await fetchActivityContentPromise(sync, activity, [
      'text/plain',
      'text/html'
    ])
    if (result) {
      return result.content.slice(0, length)
    }
  } catch (err) {
    console.error(`Failed to fetch content snippet for activity ${activity.id}`)
  }
}

async function fetchActivityContentPromise (
  sync: Sync,
  activity: DerivedActivity,
  preferences: string[] = ['text/html', 'text/plain']
): Promise<?{ content: string, mediaType: string }> {
  const links = m.mapcat(
    pref => m.filter(l => l.mediaType === pref, activity.objectLinks),
    preferences
  )
  const link = m.first(links)

  if (!link) {
    return // no content
  }

  const href = link.href
  if (!href) {
    throw new Error(
      `object link does not have an \`href\` property in activity ${activity.id}`
    )
  }

  const stream = await sync.fetchPartContent(link.href)
  return {
    content: await toString(stream, 'utf8'), // TODO: check charset
    mediaType: link.mediaType
  }
}

export function fetchActivityContent (
  sync: Sync,
  activity: DerivedActivity,
  preferences: string[] = ['text/html', 'text/plain']
): kefir.Observable<?{ content: string, mediaType: string }> {
  return kefir.fromPromise(
    fetchActivityContentPromise(sync, activity, preferences)
  )
}
