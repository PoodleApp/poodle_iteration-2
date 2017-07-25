/*
 * This module defines a query to load a single conversations for display in
 * detail.
 *
 * @flow
 */

import Conversation from 'arfe/lib/models/Conversation'
import * as kefir from 'kefir'
import Sync from 'poodle-service/lib/sync'

import type { Observable } from 'redux-slurp'

type URI = string

export { fetchActivityContent } from './content'
export type { Content } from './content'

export function fetchConversation (
  sync: Sync,
  id: URI
): Observable<Conversation, *> {
  return kefir.fromPromise(sync.getConversation(id))
}
