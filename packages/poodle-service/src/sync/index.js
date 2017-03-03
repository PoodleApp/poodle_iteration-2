/* @flow */

import Conversation            from 'arfe/lib/models/Conversation'
import cachedir                from 'cache-directory'
import findPlugin              from 'pouchdb-find'
import PouchDB                 from 'pouchdb-node'
import sanitize                from 'sanitize-filename'
import * as query              from './query'
import { startBackgroundSync } from './sync'

import type { Observable }                     from 'kefir'
import type { Readable }                       from 'stream'
import type { QueryParams, ConnectionFactory } from './types'

PouchDB.plugin(findPlugin)

type Boxes = string[]

type Options = {
  boxes:             Boxes,
  connectionFactory: ConnectionFactory,
  db?:               PouchDB,
  dbname?:           string,
  fetchInterval?:    number,  // in seconds
  onNewMail?:        () => void,
  timeFrame?:        number,  // in days
}

export default class Sync {
  _connectionFactory: ConnectionFactory
  _db:                PouchDB
  _stopSync:          () => void

  constructor(opts: Options) {
    this._connectionFactory = opts.connectionFactory
    this._db                = initDb(opts)
    this._stopSync          = startBackgroundSync({ ...opts, db: this._db })
    query.createIndexes(this._db).catch(err => console.error(err))
  }

  queryConversations(params: QueryParams): Observable<Conversation, mixed> {
    return query.queryConversations(params, this._db)
  }

  fetchPartContent(uri: string): Promise<Readable> {
    return query.fetchContentByUri(this._db, uri)
  }

  terminate() {
    this._stopSync()
  }
}

function initDb({ db, dbname }: Options): PouchDB {
  if (db) { return db }
  if (!dbname) { throw new Error('must provide either a database or a name') }
  const location = cachedir(sanitize(dbname))
  return new PouchDB(location, { adapter: 'leveldb' })
}
