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
import * as kefir from 'kefir'
import type Moment from 'moment'
import * as m from 'mori'
import Sync from 'poodle-service/lib/sync'
import { fetchContentSnippet } from './content'

type Actor = AS.models.Object
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
  queryParams: * = { labels: ['\\Inbox'], limit: 30 }
): kefir.Observable<ConversationListItem[], mixed> {
  return sync
    .queryConversations(queryParams)
    // A conversation with only non-visible activities (likes, edits, etc.) will
    // effectively be empty, so let's not display it
    .filter(conversation => !m.isEmpty(conversation.activities))
    .flatMap(processConversation.bind(null, sync))
    .scan((cs, conv) => cs.concat(conv), [])
}

function processConversation (
  sync: Sync,
  conv: Conversation
): kefir.Observable<ConversationListItem, *> {
  const activity = conv.latestActivity
  return kefir
    .fromPromise(fetchContentSnippet(sync, activity))
    .map(contentSnippet => ({
      id: conv.id,
      lastActiveTime: conv.lastActiveTime,
      latestActivity: {
        actor: activity.actor,
        contentSnippet
      },
      participants: m.intoArray(conv.flatParticipants),
      subject: conv.subject
    }))
}
