/* @flow */

import * as kefir from 'kefir'

import type { Observable } from 'kefir'

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

export function takeAll<T,E>(obs: Observable<T,E>): Promise<T[]> {
  return obs.scan(
    (xs: T[], x: T) => xs.concat(x), []
  )
  .last()
  .toPromise()
}
