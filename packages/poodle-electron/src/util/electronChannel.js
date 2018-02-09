/*
 * Abstraction for requests and responses over Electron IPC. This is useful
 * for stuff like sending requests to an IMAP interface worker via Electron IPC.
 * Assumes that `serve` is called from the main process.
 *
 * @flow
 */

import { ipcMain, ipcRenderer } from 'electron'
import * as kefir from 'kefir'
import {
  type Action,
  type Channel
} from 'poodle-service/lib/accounts/AccountService'
import uuid from 'uuid/v4'

type Request<T> = { transactionId: string, action: Action<T> }

type Response<R> =
  | { transactionId: string, value: R }
  | { transactionId: string, error: string }
  | { transactionId: string, complete: true }

type Unsubscribe = { transactionId: string }

const REQUEST = 'action-channel-request'
const RESPONSE = 'action-channel-response'
const UNSUBSCRIBE = 'action-channel-unsubscribe'

export function request<T> (action: Action<T>): kefir.Observable<T, Error> {
  return kefir.stream(emitter => {
    const transactionId = getTransactionId()

    // Listen for responses
    const responseListener = (event: Object, response: Response<T>) => {
      if (response.transactionId === transactionId) {
        if (response.hasOwnProperty('value')) {
          emitter.value((response: any).value)
        } else if (response.complete) {
          emitter.end()
          ipcRenderer.removeListener(RESPONSE, responseListener)
        } else if (response.error) {
          emitter.error(new Error(response.error || 'request failed'))
        } else {
          console.error('Unknown response type:', response)
        }
      }
    }
    ipcRenderer.on(RESPONSE, responseListener)

    // Send request
    const request: Request<T> = { transactionId, action }
    ipcRenderer.send(REQUEST, request)

    return function unsubscribe () {
      ipcRenderer.removeListener(RESPONSE, responseListener)
      ipcRenderer.send(UNSUBSCRIBE, { transactionId })
    }
  })
}

export function serve<T> (
  handler: (action: Action<T>) => kefir.Observable<T, Error>
) {
  ipcMain.on(REQUEST, (event: Object, request: Request<T>) => {
    const subscription = handler(request.action).observe({
      value (value) {
        const response: Response<T> = {
          transactionId: request.transactionId,
          value
        }
        event.sender.send(RESPONSE, response)
      },
      error (error) {
        const response: Response<T> = {
          transactionId: request.transactionId,
          error: error.message
        }
        event.sender.send(RESPONSE, response)
      },
      end () {
        const response: Response<T> = {
          transactionId: request.transactionId,
          complete: true
        }
        event.sender.send(RESPONSE, response)
        ipcMain.removeListener(UNSUBSCRIBE, unsubscribe)
      }
    })
    function unsubscribe ({ transactionId }: Unsubscribe) {
      if (transactionId === request.transactionId) {
        subscription.unsubscribe()
        ipcMain.removeListener(UNSUBSCRIBE, unsubscribe)
      }
    }
    ipcMain.on(UNSUBSCRIBE, unsubscribe)
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

export default ({ request, serve }: Channel)
