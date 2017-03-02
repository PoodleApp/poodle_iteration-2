/*
 * Synchronize email in background.
 * We will probably want to split this out into its own library later,
 * and make it usable as a pluggable backend for graphql-imap.
 *
 * @flow
 */

import Message    from 'arfe/lib/models/Message'
import Connection from 'imap'
import * as kefir from 'kefir'
import PouchDB    from 'pouchdb-node'

import * as actions  from '../actions'
import * as imaputil from '../util/imap'
import * as persist  from './persist'

import type { ReadStream }        from 'fs'
import type { Box }               from 'imap'
import type { Observable }        from 'kefir'
import type { ConnectionFactory } from './types'

type Options = {
  boxes:             Boxes,
  connectionFactory: ConnectionFactory,
  db:                PouchDB,
  fetchInterval?:    number,  // in seconds
  onNewMail?:        () => void,
  timeFrame?:        number,  // in days
}

type Boxes = string[]

// TODO: periodically evict stale items from cache

const days    = 86400000 // ms
const seconds = 1000     // ms

/*
 * Starts synchronization tasks, which continue to run in the background.
 * Returns a function that will terminate background tasks when called.
 */
export function startBackgroundSync({ boxes, connectionFactory, db, ...opts }: Options): () => void {
  const fetchInterval = (opts.fetchInterval || 300) * seconds
  const onNewMail     = opts.onNewMail || noop
  const timeFrame     = (opts.timeFrame || 30) * days

  let lastFetchTime: ?Date
  let pending: number

  function schedule() {
    const now = new Date()
    const nextFetchTime = lastFetchTime
      ? Number(lastFetchTime) + fetchInterval
      : Number(now)
    const delay = Math.min(0, nextFetchTime - now)

    pending = setTimeout(() => {
      lastFetchTime = new Date
      fetch(boxes, timeFrame, connectionFactory, db).onEnd(onNewMail)
      schedule()
    }, delay)
  }
  schedule()

  return function terminate() {
    clearTimeout(pending)
  }
}

// TODO: subscribe to new messages using IDLE

function fetch(boxes: Boxes, timeFrame: number, cf: ConnectionFactory, db: PouchDB): Observable<void, mixed> {
  const now   = new Date()
  const since = new Date(Number(now) - timeFrame)
  const bs    = boxes.map(async boxAttr => {
    const conn = await cf()
    const box  = await imaputil.openBox(imaputil.boxByAttribute(boxAttr), true, conn)
    return [box, conn]
  })

  // TODO: avoid downloading messages that have already been downloaded
  return kefir.merge(bs.map(kefir.fromPromise))
    .flatMap(([box, conn]) => {
      return actions.fetchRecent(since, box, conn)
        .flatMap(message => kefir.fromPromise(
          persist.persistMessage(db, message)
        )
          .flatMap(_ => fetchParts(message, box, conn, db))
        )
    })
    // TODO: fetch any messages referenced by recent messages
    .map(_ => undefined)  // yield `undefined` until we settle on the contract that we really want
}

function fetchParts(message: Message, box: Box, conn: Connection, db: PouchDB): Observable<string, mixed> {
  return kefir.sequentially(0, message.parts)
    .filter(part => !!part.partID)  // TODO: skip parts with no ID
    .filter(part => !part.subtype)  // skip multipart parts
    .flatMap(part => kefir.fromPromise(
      actions.fetchMessagePart(message, part.partID || '', conn)
      .then(data => persist.persistPart(db, message, part, data))
      .then(_ => message.uriForPart(part))
    ))
}

function noop() {}
