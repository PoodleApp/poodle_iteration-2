/*
 * This module defines a query to load a list of conversations for display in
 * a list view, such as an activity stream view. Data includes some information
 * about the latest activity in each conversation, and participants in the
 * history of each conversation.
 *
 * @flow
 */

import Conversation from 'arfe/lib/models/Conversation'
import * as kefir from 'kefir'
import type Moment from 'moment'
import * as m from 'mori'
import Sync from 'poodle-service/lib/sync'
import type { Observable } from 'redux-slurp'
import { type Actor, processActor } from './actor'
import { fetchContentSnippet } from './content'
import { resolveLanguageValue } from './lang'

export type { Actor } from './actor'

type URI = string

export type ConversationListItem = {
  id: URI,
  lastActiveTime: Moment,
  latestActivity: ActivityListItem,
  participants: Actor[],
  subject: ?string
}

export type ActivityListItem = {
  actor: ?Actor,
  contentSnippet: ?string
}

export function fetchConversations (
  sync: Sync,
  langs: string[],
  queryParams: * = { labels: ['\\Inbox'], limit: 30 }
): Observable<ConversationListItem[], *> {
  return sync
    .queryConversations(queryParams)
    .flatMap(processConversation.bind(null, sync, langs))
    .scan((cs, conv) => cs.concat(conv), [])
}

function processConversation (
  sync: Sync,
  langs: string[],
  conv: Conversation
): kefir.Observable<ConversationListItem, *> {
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
      subject: conv.subject && resolveLanguageValue(langs, conv.subject)
    }))
}
