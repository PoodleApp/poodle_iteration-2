/*
 * Exposes methods for communicating with an IMAP server. Some providers have
 * strict limits on numbers of open connections - so we want to keep IMAP
 * connections to a minimum. So this interface abstracts over a worker pool (of
 * size 1 by default). The interface also abstracts over stateful properties of
 * IMAP connections, such as opening and closing boxes.
 *
 * @flow
 */

import { type URI } from 'arfe/lib/models/uri'
import type EventEmitter from 'events'
import Connection, * as imap from 'imap'
import * as kefir from 'kefir'
import type PouchDB from 'pouchdb-node'
import * as Conn from '../connection'
import { type ConnectionFactory } from '../models/ImapAccount'
import { withBox } from '../models/connection'
import * as kefirUtil from '../util/kefir'
import * as promises from '../util/promises'
import * as actions from './actions/imap'
import JobQueue from './JobQueue'

// TODO
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
  _db: PouchDB
  _lock: ?Promise<void>
  _queue: JobQueue<actions.Action, Result>

  constructor (connectionFactory: ConnectionFactory, db: PouchDB) {
    this._connectionFactory = connectionFactory
    this._db = db
    this._queue = new JobQueue(this._process.bind(this))
  }

  request (action: actions.Action): kefir.Observable<Result> {
    return this._queue.process(action)
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

  _process (action: actions.Action): kefir.Observable<Result> {
    return kefir
      .fromPromise(this._getConn())
      .flatMap(conn => process(action, conn, this._db))
  }
}

function process (
  action: actions.Action,
  conn: Connection,
  db: PouchDB
): kefir.Observable<Result> {
  switch (action.type) {
    // case actions.FETCH_THREADS:
    //   return kefir.constant({ recordIds: [] })
    case actions.FETCH_PART:
      const { messageId, uid, part } = action
      return withBox(action.box, conn, true, openBox => kefir.fromPromise(
        Conn.downloadPartContent(messageId, uid, part, openBox, db)
      ))
    case actions.GET_CAPABILITIES:
      return kefir.constant(conn._caps || [])
    // case actions.SEARCH:
    //   const criteria = action.criteria
    //   return kefir.fromPromise(
    //     promises.lift1(cb => conn.search(criteria, cb)).then(uids => ({ uids }))
    //   )
    case actions.QUERY_CONVERSATIONS:
      return Conn.queryConversations(action, conn, db)
    default:
      return kefir.constantError(
        new Error(`Unknown action type: ${action.type}`)
      )
  }
}
