/* @flow */

import Conversation            from 'arfe/lib/models/Conversation'
import cachedir                from 'cache-directory'
import * as nodemailer         from 'nodemailer'
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
type MessageOptions = Object
type Transporter = Object

type Options = {
  boxes:             Boxes,
  connectionFactory: ConnectionFactory,
  db?:               PouchDB,
  dbname?:           string,
  fetchInterval?:    number,  // in seconds
  onNewMail?:        () => void,
  smtpConfig:        Object,
  timeFrame?:        number,  // in days
}

export default class Sync {
  _connectionFactory: ConnectionFactory
  _db:                PouchDB
  _smtpTransport:     Transporter
  _stopSync:          () => void

  constructor(opts: Options) {
    this._connectionFactory = opts.connectionFactory
    this._db                = initDb(opts)
    this._smtpTransport     = nodemailer.createTransport(opts.smtpConfig)
    this._stopSync          = startBackgroundSync({ ...opts, db: this._db })
    query.createIndexes(this._db).catch(err => console.error(err))
  }

  getConversation(id: string): Promise<Conversation> {
    return query.getConversation(id, this._db)
  }

  queryConversations(params: QueryParams): Observable<Conversation, mixed> {
    return query.queryConversations(params, this._db)
  }

  fetchPartContent(uri: string): Promise<Readable> {
    return query.fetchContentByUri(this._db, uri)
  }

  send(message: MessageOptions): Promise<DeliveryResult> {
    return this._smtpTransport.sendMail(message)
  }

  terminate() {
    this._stopSync()
  }
}

// Data from nodemailer
type DeliveryResult = {
  messageId: string,
  envelope: Object,
  accepted: mixed[],
  rejected: mixed[],
  pending: mixed[],
  response: string
}

function initDb({ db, dbname }: Options): PouchDB {
  if (db) { return db }
  if (!dbname) { throw new Error('must provide either a database or a name') }
  const location = cachedir(sanitize(dbname))
  return new PouchDB(location, { adapter: 'leveldb' })
}
