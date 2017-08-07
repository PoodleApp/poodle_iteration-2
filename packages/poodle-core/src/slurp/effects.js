/* @flow */

import * as kefir from 'kefir'

export const SUBSCRIBE: 'slurp/subscribe' = 'slurp/subscribe'

export type Effect<T, E> = {
  type: typeof SUBSCRIBE,
  observableFn: (...args: any[]) => kefir.Observable<T, E> | Promise<T>,
  args: any[]
}

export function subscribe<T, E> (
  observableFn: (...args: any[]) => kefir.Observable<T, E> | Promise<T>,
  ...args: any[]
): Effect<T, E> {
  return {
    type: SUBSCRIBE,
    observableFn,
    args
  }
}
