/* @flow */

import * as kefir from 'kefir'
import type Task from './Task'
import { type State } from './types'

export * from './account'
export * from './basic'
export { queryConversations, queryConversationsForListView } from './google'
export * from './local'
export * from './smtp'
export { default as Task, Context } from './Task'
export * from './types'

export type Perform = <A, Args: *>(
  taskFn: (...args: Args) => Task<A>,
  args: Args,
  initialState?: $Shape<State>
) => kefir.Observable<A, Error>
