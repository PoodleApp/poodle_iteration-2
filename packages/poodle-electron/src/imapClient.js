/* @flow */

import { ipcRenderer } from 'electron'
import * as kefir from 'kefir'
import { type Effect, subscribe } from 'poodle-core/lib/slurp/effects'
import * as accounts from 'poodle-service/lib/accounts'
import * as cache from 'poodle-service/lib/cache'
import { type Action as ImapAction } from 'poodle-service/lib/request/actions'
import { type Action as SmtpAction } from 'poodle-service/lib/smtp/actions'
import * as tasks from 'poodle-service/lib/tasks'

export const accountClient = new accounts.AccountClient(ipcRenderer)
const dbPromise = cache.initialize()

export function _perform<T, Args: *> (
  taskFn: (...args: Args) => tasks.Task<T>,
  args: Args,
  initialState?: $Shape<tasks.State>
): kefir.Observable<T, Error> {
  return kefir.fromPromise(dbPromise).flatMap(db => {
    const task = taskFn(...args)
    const context: tasks.Context = {
      runAccountAction<T> (action: accounts.Action<T>): kefir.Observable<T> {
        return accountClient.runAccountAction(action)
      },
      runImapAction<T> (action: ImapAction<T>, state: *): kefir.Observable<T> {
        return accountClient.runImapAction(action, state)
      },
      runSmtpAction<T> (action: SmtpAction<T>, state: *): kefir.Observable<T> {
        return accountClient.runSmtpAction(action, state)
      },
      db
    }
    return task.perform(context, initialState)
  })
}

export function perform<T, Args: *> (
  taskFn: (...args: Args) => tasks.Task<T>,
  args: Args,
  initialState?: $Shape<tasks.State>
): Effect<T, Error> {
  return subscribe(_perform, taskFn, args, initialState)
}
