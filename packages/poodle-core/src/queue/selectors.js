/* @flow */

import { type URI } from 'arfe/lib/models/uri'
import { type State as QueueState } from './reducer'

export function likePending<State: { queue: QueueState }>(uri: URI, state: State): boolean {
  const pending = state.queue.pendingLikes || []
  return pending.includes(uri)
}
