/*
 * This module defines a query to load a list of conversations for display in
 * a list view, such as an activity stream view. Data includes some information
 * about the latest activity in each conversation, and participants in the
 * history of each conversation.
 *
 * @flow
 */

import * as AS from 'activitystrea.ms'
import Conversation from 'arfe/lib/models/Conversation'
import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import * as kefir from 'kefir'
import type Moment from 'moment'
import * as m from 'mori'
import Sync from 'poodle-service/lib/sync'
import type { Observable } from 'redux-slurp'
import toString from 'stream-to-string'

type URI = string

export type ListViewConversation = {
  id: URI,
  lastActiveTime: Moment,
  latestActivity: ListViewActivity,
  participants: Actor[],
  subject: ?string
}

export type ListViewActivity = {
  actor: ?Actor,
  contentSnippet: ?string
}

export type Actor = {
  displayName: string,
  email: string
}

export default function queryConversations (
  sync: Sync,
  lang: string,
  queryParams: * = { labels: ['\\Inbox'], limit: 30 }
): Observable<ListViewConversation[], *> {
  return sync
    .queryConversations(queryParams)
    .flatMap(processConversation.bind(null, sync, lang))
    .scan((cs, conv) => cs.concat(conv), [])
}

function processConversation (
  sync: Sync,
  lang: string,
  conv: Conversation
): kefir.Observable<ListViewConversation, *> {
  const activity = conv.latestActivity
  return kefir
    .fromPromise(fetchContentSnippet(sync, activity))
    .map(contentSnippet => ({
      id: conv.id,
      lastActiveTime: conv.lastActiveTime,
      latestActivity: {
        actor: activity.actor && processActor(activity.actor),
        contentSnippet
      },
      participants: m.intoArray(conv.flatParticipants),
      subject: conv.subject && resolveLanguageValue(lang, conv.subject)
    }))
}

async function fetchContentSnippet (
  sync: Sync,
  activity: DerivedActivity,
  length: number = 100
): Promise<?string> {
  const result = await fetchActivityContent(sync, activity, [
    'text/plain',
    'text/html'
  ])
  if (result) {
    return result.content.slice(0, length)
  }
}

async function fetchActivityContent (
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

function processActor (lang: string, actor: AS.models.Object): Actor {
  const email = emailFromId(actor.id)
  const displayName = actor.name
    ? resolveLanguageValue(lang, actor.name)
    : email
  return { displayName, email }
}

function emailFromId (id: string): string {
  return id.replace(/^[a-z]+:/, '')
}

function resolveLanguageValue (
  lang: string,
  lv: AS.models.LanguageValue
): string {
  return lv.get(lang) || lv.get()
}
