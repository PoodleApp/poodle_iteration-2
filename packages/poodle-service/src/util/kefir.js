/* @flow */

import * as kefir from 'kefir'

import type { Observable } from 'kefir'

export function collectData<S:events$EventEmitter>(
  eventSource: S
): Observable<Buffer, mixed> {
  const chunkEvents = fromEventsWithEnd(eventSource, 'data')
  return chunkEvents.scan(
    (chunks: Buffer[], chunk) => chunks.concat(chunk), []
  )
    .last()
    .map(chunks => {
      return Buffer.concat(chunks)
    })
}

export function fromEventsWithEnd<T,S:events$EventEmitter>(
  eventSource: S,
  eventName: string,
  transform: ?((...values: any) => T) = null
): Observable<T,mixed> {
  return kefir.stream(emitter => {
    eventSource.on(eventName, (...values) => {
      const value = transform ? transform(...values) : values[0]
      emitter.emit(value)
    })
    eventSource.once('error', err => { emitter.error(err); emitter.end() })
    eventSource.once('end', () => { emitter.end() })
  })
}

export function takeAll<T,E>(obs: Observable<T,E>): Observable<T[],E> {
  return obs.scan(
    (xs: T[], x: T) => xs.concat(x), []
  )
  .last()
}
