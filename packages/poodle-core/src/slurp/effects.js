/* @flow */

import * as kefir from 'kefir'

export type Effect<T, E = Error> =
  | {
      type: 'slurp/observable',
      observableFn: (...args: any[]) => kefir.Observable<T, E>,
      args: any[]
    }
  | {
      type: 'slurp/promise',
      promiseFn: (...args: any[]) => Promise<T>,
      args: any[]
    }

export function observable<T, E> (
  observableFn: (...args: any[]) => kefir.Observable<T, E>,
  ...args: any[]
): Effect<T, E> {
  return {
    type: 'slurp/observable',
    observableFn,
    args
  }
}

export function promise<T> (
  promiseFn: (...args: any[]) => Promise<T>,
  ...args: any[]
): Effect<T> {
  return {
    type: 'slurp/promise',
    promiseFn,
    args
  }
}
