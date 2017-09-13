/* @flow */

import * as kefir from 'kefir'

import type { Observable } from 'kefir'

export function catMaybes<T, E> (obs: Observable<T, E>): Observable<$NonMaybeType<T>, E> {
  return obs.filter(x => !!x)
}

export function collectData<S: events$EventEmitter> (
  eventSource: S
): Observable<Buffer, Error> {
  const chunkEvents = fromEventsWithEnd(eventSource, 'data')
  return chunkEvents
    .scan((chunks: Buffer[], chunk) => chunks.concat(chunk), [])
    .last()
    .map(chunks => {
      return Buffer.concat(chunks)
    })
}

/*
 * Given an observable and a callback, run the callback when the input
 * observable completes (whether or not it has produced any values). Returns an
 * observable that completes when the observable returned by the callback
 * completes. The returned observable produces the same values and/or errors as
 * the input.
 */
export function ensure<T, E, Obs: Observable<T, E>> (
  input: Obs,
  callback: () => Observable<any, any>
): Obs {
  return input.concat(
    kefir.constant(1).flatMap(_ => callback()).flatMap(_ => kefir.never())
  )
}

export function fromEventsWithEnd<T, S: events$EventEmitter> (
  eventSource: S,
  eventName: string,
  transform: ?(...values: any) => T = null
): Observable<T, Error> {
  return kefir.stream(emitter => {
    eventSource.on(eventName, (...values) => {
      const value = transform ? transform(...values) : values[0]
      emitter.emit(value)
    })
    eventSource.once('error', err => {
      emitter.error(err instanceof Error ? err : new Error(err))
      emitter.end()
    })
    eventSource.once('end', () => {
      emitter.end()
    })
  })
}

export function takeAll<T, E> (obs: Observable<T, E>): Observable<T[], E> {
  return obs.scan((xs: T[], x: T) => xs.concat(x), []).last()
}
