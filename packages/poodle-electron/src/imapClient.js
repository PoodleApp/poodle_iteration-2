/* @flow */

import * as kefir from 'kefir'
import { type Effect, subscribe } from 'poodle-core/lib/slurp/effects'
import * as Imap from 'poodle-service/lib/ImapInterface/Client'
import * as tasks from 'poodle-service/lib/tasks'
import service from './imapService'

const imapClient = Imap.NewClient(service)
export default imapClient

export function perform<T, Args: *> (
  taskFn: (...args: Args) => tasks.Task<T>,
  args: Args,
  initialState?: $Shape<tasks.State>
): Effect<T, Error> {
  return subscribe(
    Imap.perform,
    imapClient,
    taskFn,
    args,
    initialState
  )
}
