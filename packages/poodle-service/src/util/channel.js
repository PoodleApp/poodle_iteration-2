/*
 * Abstraction for requests and responses over an EventEmitter. This is useful
 * for stuff like sending requests to an IMAP interface worker via Electron IPC.
 *
 * @flow
 */

import type EventEmitter from 'events'
import * as kefir from 'kefir'
import uuid from 'uuid/v4'

type Request<T> = { transactionId: string, action: T }

type Response<R> =
  | { transactionId: string, value: R }
  | { transactionId: string, error: string }
  | { transactionId: string, complete: true }

type Unsubscribe = { transactionId: string }

export const REQUEST = 'action-channel-request'
export const RESPONSE = 'action-channel-response'
export const UNSUBSCRIBE = 'action-channel-unsubscribe'

export function request<T, R> (action: T, channel: EventEmitter): kefir.Observable<R> {
  return kefir.stream(emitter => {
    const transactionId = getTransactionId()

    // Listen for responses
    const responseListener = (response: Response<R>) => {
      if (response.transactionId === transactionId) {
        if (response.hasOwnProperty('value')) {
          emitter.value((response: any).value)
        } else if (response.complete) {
          emitter.end()
          channel.removeListener(RESPONSE, responseListener)
        } else {
          emitter.error(new Error(response.error || 'request failed'))
        }
      }
    }
    channel.addListener(RESPONSE, responseListener)

    // Send request
    const request: Request<T> = { transactionId, action }
    channel.emit(REQUEST, request)

    return function unsubscribe() {
      channel.removeListener(RESPONSE, responseListener)
      channel.emit(UNSUBSCRIBE, { transactionId })
    }
  })
}

export function serve<T, R> (
  handler: (action: T) => kefir.Observable<R>,
  channel: EventEmitter
) {
  channel.addListener(REQUEST, (request: Request<T>) => {
    const subscription = handler(request.action).observe({
      value(value) {
        const response: Response<R> = {
          transactionId: request.transactionId,
          value
        }
        channel.emit(RESPONSE, response)
      },
      error(error) {
        const response: Response<R> = {
          transactionId: request.transactionId,
          error: error.message
        }
        channel.emit(RESPONSE, response)
      },
      end() {
        const response: Response<R> = {
          transactionId: request.transactionId,
          complete: true
        }
        channel.emit(RESPONSE, response)
        channel.removeListener(UNSUBSCRIBE, unsubscribe)
      }
    })
    function unsubscribe({ transactionId }: Unsubscribe) {
      if (transactionId === request.transactionId) {
        subscription.unsubscribe()
        channel.removeListener(UNSUBSCRIBE, unsubscribe)
      }
    }
    channel.addListener(UNSUBSCRIBE, unsubscribe)
  })
}

/*
 * Be aware that we are likely to generate transaction IDs from multiple
 * processes, so there must be some mechanism to prevent collisions.
 */
let transactionCount = 0
const prefix = uuid()
function getTransactionId (): string {
  transactionCount += 1
  return `${prefix}-${transactionCount}`
}
