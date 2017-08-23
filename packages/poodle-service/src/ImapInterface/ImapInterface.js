/*
 * Exposes methods for communicating with an IMAP server. Some providers have
 * strict limits on numbers of open connections - so we want to keep IMAP
 * connections to a minimum. So this interface abstracts over a worker pool (of
 * size 1 by default). The interface also abstracts over stateful properties of
 * IMAP connections, such as opening and closing boxes.
 *
 * @flow
 */

import type EventEmitter from 'events'
import Connection, * as imap from 'imap'
import * as actions from '../actions'
import { type ConnectionFactory } from '../types'
import * as promises from '../util/promises'
import JobQueue from './JobQueue'
import * as tasks from './tasks'

type Result = any // TODO

/*
 * Given a `connectionFactory`, manages connection state and acts as an
 * interface to an IMAP server. The connection produced by `connectionFactory`
 * should be authenticated and ready (the factory should wait for the connection
 * to emit a `'ready'` event before resolving the returned promise).
 */
export class ImapInterface {
  _conn: ?Promise<Connection>
  _connectionFactory: ConnectionFactory
  _queue: JobQueue<tasks.Task, Result>

  constructor (connectionFactory: ConnectionFactory) {
    this._connectionFactory = connectionFactory
    this._queue = new JobQueue(this._processTask.bind(this))
  }

  process (task: tasks.Task): Promise<Result> {
    return this._queue.process(task)
  }

  async _getConn (): Promise<Connection> {
    if (!this._conn) {
      const connPromise = this._connectionFactory().then(conn => {
        const onClose = () => {
          if (this._conn === connPromise) {
            this._conn = null
          }
        }
        conn.addListener('close', onClose)
        conn.addListener('end', onClose)
        return conn
      })
      this._conn = connPromise
    }
    return this._conn
  }

  async _processTask (task: tasks.Task): Promise<Result> {
    const conn = await this._getConn()
    checkCapabilities(task, conn)
    switch (task.type) {
      case tasks.FETCH:

      case tasks.SEARCH:
        return promises.lift1(cb => conn.search(task.criteria, cb))
      default:
        throw new Error(`Unknown task type: ${task.type}`)
    }
  }
}

function checkCapabilities (task: tasks.Task, conn: Connection) {
  const missing = task.capabilities.filter(cap => !conn.serverSupports(cap))
  if (missing.length > 0) {
    throw new Error(
      `Task one or more capabilities that the server does not support: ${missing.join(
        ', '
      )}`
    )
  }
}
