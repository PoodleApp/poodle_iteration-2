/* @flow */

import * as kefir from 'kefir'
import { type Observable } from 'kefir'
import { Readable } from 'stream'

export function batch<A, B, E> (
  batchSize: number,
  input: A[],
  fn: (ts: A[]) => Observable<B, E>
): Observable<B, E> {
  const batches = []
  for (let i = 0; i < input.length; i += batchSize) {
    batches.push(input.slice(i, i + batchSize))
  }
  return sequence(batches, fn)
}

export function catMaybes<T, E> (
  obs: Observable<T, E>
): Observable<$NonMaybeType<T>, E> {
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

export function fromReadable (input: Readable): Observable<Buffer> {
  return fromEventsWithEnd(input, 'data')
}

export function toReadable (input: Observable<Buffer>): Readable {
  const output = new Readable()
  input.onValue(buffer => { output.push(buffer) })
  input.onEnd(() => { output.push(null) })
  return output
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

/*
 * Wait until the given observable ends, then run the callback to produce
 * a second observable. Returns an observable that emits all values from both.
 */
export function andThen<A, E> (
  obs: Observable<A, E>,
  fn: () => Observable<A, E>
): Observable<A, E> {
  const next = obs.ignoreValues().beforeEnd(() => 1).flatMap(fn)
  return obs.concat(next)
}

/*
 * Kefir's built-in `scan` method resets its accumulator on encountering an
 * error. This version emits errors like the built-in method, but does not reset
 * the accumulator.
 */
export function scan<T, R, E> (
  input: Observable<T, E>,
  fn: (accum: R, value: T) => R,
  seed: R
): Observable<R, E> {
  const errors = input.ignoreValues()
  const values = input.ignoreErrors().scan(fn, seed)
  return values.merge(errors)
}

export function sequence<A, B, E> (
  input: A[],
  fn: (a: A) => Observable<B, E>
): Observable<B, E> {
  if (input.length < 1) {
    return kefir.never()
  }
  const item = input[0]
  const rest = input.slice(1)
  return andThen(fn(item), () => sequence(rest, fn))
}

export function takeAll<T, E> (obs: Observable<T, E>): Observable<T[], E> {
  return obs.scan((xs: T[], x: T) => xs.concat(x), []).last()
}
