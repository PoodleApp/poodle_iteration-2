/* @flow */

import Sync from 'poodle-service/lib/sync'
import { type State as AuthState } from '../reducers/auth'

export function getSync<State: { auth: AuthState }>(state: State): ?Sync {
  return state.auth.sync
}
