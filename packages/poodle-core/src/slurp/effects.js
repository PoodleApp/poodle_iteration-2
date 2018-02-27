/* @flow */

import * as kefir from 'kefir'

export const SUBSCRIBE: 'slurp/subscribe' = 'slurp/subscribe'

export type Effect<T, E, Args = *> = {
  type: typeof SUBSCRIBE,
  observableFn: (...args: Args) => kefir.Observable<T, E>,
  args: Args
}

export function subscribe<T, E, Args: *> (
  observableFn: (...args: Args) => kefir.Observable<T, E>,
  ...args: Args
): Effect<T, E> {
  return {
    type: SUBSCRIBE,
    observableFn,
    args
  }
}
