/*
 * Abstraction for requests and responses over an EventEmitter. This is useful
 * for stuff like sending requests to an IMAP interface worker via Electron IPC.
 *
 * @flow
 */

import type EventEmitter from 'events'

type Request<T> = {
  transactionId: string,
  task: T
}

type Response<R> =
  | { transactionId: string, result: R }
  | { transactionId: string, error: string }

export const REQUEST = 'imap-task-channel-request'
export const RESPONSE = 'imap-task-channel-response'

export function request<T, R> (task: T, channel: EventEmitter): Promise<R> {
  return new Promise((resolve, reject) => {
    const transactionId = getTransactionId()
    const responseListener = (response: Response<R>) => {
      if (response.transactionId === transactionId) {
        if (response.result) {
          resolve((response.result: any))
        } else {
          reject(new Error(response.error || 'request failed'))
        }
      }
    }
    const request: Request<T> = { transactionId, task }
    channel.emit(REQUEST, request)
  })
}

export function serve<T, R> (
  processor: (task: T) => Promise<R>,
  channel: EventEmitter
) {
  channel.addListener(REQUEST, async (request: Request<T>) => {
    try {
      const result = await processor(request.task)
      const response: Response<R> = {
        transactionId: request.transactionId,
        result
      }
      channel.emit(RESPONSE, response)
    } catch (err) {
      const response: Response<R> = {
        transactionId: request.transactionId,
        error: err.message
      }
      channel.emit(RESPONSE, response)
    }
  })
}

// TODO: update ID generation when we start generating tasks from multiple
// windows
let lastTransactionId = 0
function getTransactionId (): string {
  lastTransactionId += 1
  return `task-${lastTransactionId}`
}
