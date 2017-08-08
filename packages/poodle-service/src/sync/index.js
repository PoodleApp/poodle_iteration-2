/* @flow */

import Conversation from 'arfe/lib/models/Conversation'
import cachedir from 'cache-directory'
import mkdirp from 'mkdirp'
import nodemailer from 'nodemailer'
import * as path from 'path'
import findPlugin from 'pouchdb-find'
import PouchDB from 'pouchdb-node'
import sanitize from 'sanitize-filename'
import * as promises from '../util/promises'
import * as query from './query'
import { startBackgroundSync } from './sync'

import type { Observable } from 'kefir'
import type { Readable } from 'stream'
import type { QueryParams, ConnectionFactory } from './types'

PouchDB.plugin(findPlugin)

type Boxes = string[]
type MessageOptions = Object
type Transporter = Object

type Options = {
  boxes: Boxes,
  connectionFactory: ConnectionFactory,
  db?: PouchDB,
  dbname?: string,
  fetchInterval?: number, // in seconds
  onNewMail?: () => void,
  smtpConfig: Object,
  timeFrame?: number // in days
}

export async function newSync (opts: Options) {
  const db = await initDb(opts)
  const smtpTransport = nodemailer.createTransport(opts.smtpConfig)
  await query.createIndexes(db)
  await promises.lift1(cb => smtpTransport.verify(cb))
  return new Sync({
    connectionFactory: opts.connectionFactory,
    db,
    smtpTransport,
    stopSync: startBackgroundSync({ ...opts, db })
  })
}

export default class Sync {
  _connectionFactory: ConnectionFactory
  _db: PouchDB
  _smtpTransport: Transporter
  _stopSync: () => void

  constructor (opts: {
    connectionFactory: ConnectionFactory,
    db: PouchDB,
    smtpTransport: Transporter,
    stopSync: () => void
  }) {
    this._connectionFactory = opts.connectionFactory
    this._db = opts.db
    this._smtpTransport = opts.smtpTransport
    this._stopSync = opts.stopSync
  }

  getConversation (id: string): Promise<Conversation> {
    return query.getConversation(id, this._db)
  }

  queryConversations (params: QueryParams): Observable<Conversation, mixed> {
    return query.queryConversations(params, this._db)
  }

  fetchPartContent (uri: string): Promise<Readable> {
    return query.fetchContentByUri(this._db, uri)
  }

  send (message: MessageOptions): Promise<DeliveryResult> {
    return this._smtpTransport.sendMail(message)
  }

  terminate () {
    this._stopSync()
  }
}

// Data from nodemailer
type DeliveryResult = {
  messageId: string,
  envelope: Object,
  accepted: string[], // email addresses
  rejected: string[],
  pending: string[],
  response: string
}

async function initDb ({ db, dbname }: Options): PouchDB {
  if (db) {
    return db
  }
  if (!dbname) {
    throw new Error('must provide either a database or a name')
  }
  const location = cachedir(path.join(sanitize(dbname), 'db'))
  await promises.lift0(cb => mkdirp(location, cb))
  return new PouchDB(location, { adapter: 'leveldb' })
}
