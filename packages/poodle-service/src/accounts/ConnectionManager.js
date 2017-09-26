/*
 * Exposes methods for communicating with an IMAP server. Some providers have
 * strict limits on numbers of open connections - so we want to keep IMAP
 * connections to a minimum. So this interface abstracts over a worker pool (of
 * size 1 by default). The interface also abstracts over stateful properties of
 * IMAP connections, such as opening and closing boxes.
 *
 * @flow
 */

import type Connection from 'imap'
import * as kefir from 'kefir'
import { type ConnectionFactory } from '../models/ImapAccount'
import * as request from '../request'
import { type Action } from '../request/actions'
import JobQueue from './JobQueue'

type Request<T> = { action: Action<T>, state: request.ConnectionState }
type Result = any

/*
 * Given a `connectionFactory`, manages connection state and acts as an
 * interface to an IMAP server. The connection produced by `connectionFactory`
 * should be authenticated and ready (the factory should wait for the connection
 * to emit a `'ready'` event before resolving the returned promise).
 */
export default class ConnectionManager {
  _conn: ?Promise<Connection>
  _connectionFactory: ConnectionFactory
  _queue: JobQueue<Request<any>, Result>

  constructor (connectionFactory: ConnectionFactory) {
    this._connectionFactory = connectionFactory
    this._queue = new JobQueue(this._process.bind(this))
  }

  request<T> (
    action: Action<T>,
    state: request.ConnectionState
  ): kefir.Observable<T> {
    return this._queue.process({ action, state })
  }

  // TODO: close connection after a period of inactivity
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

  _process<T> ({ action, state }: Request<T>): kefir.Observable<T> {
    return kefir
      .fromPromise(this._getConn())
      .flatMap(conn => request.perform(action, state, conn))
  }
}
