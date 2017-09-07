/*
 * Synchronize email in background.
 *
 * @flow
 */

import Message from 'arfe/lib/models/Message'
import Connection from 'imap'
import * as kefir from 'kefir'
import PouchDB from 'pouchdb-node'

import * as actions from '../actions'
import * as imaputil from '../util/imap'
import * as promises from '../util/promises'
import * as persist from './persist'

import type { Box } from 'imap'
import type { Observable } from 'kefir'
import type { ConnectionFactory } from '../models/ImapAccount'

type Options = {
  boxes: BoxName[],
  connectionFactory: ConnectionFactory,
  db: PouchDB,
  fetchInterval?: number, // in seconds
  onNewMail?: () => void,
  timeFrame?: number // maximum age of messages to sync, in days
}

type BoxName = string

// TODO: periodically evict stale items from cache

const days = 86400000 // ms
const seconds = 1000 // ms

/*
 * Starts synchronization tasks, which continue to run in the background.
 * Returns a function that will terminate background tasks when called.
 */
export function startBackgroundSync ({
  boxes,
  connectionFactory,
  db,
  ...opts
}: Options): () => void {
  const fetchInterval = (opts.fetchInterval || 300) * seconds
  const onNewMail = opts.onNewMail || noop
  const timeFrame = (opts.timeFrame || 30) * days

  let lastFetchTime: ?Date
  if (process.env.NODE_ENV === 'development') {
    // Avoid running a sync immediately on startup when in development mode
    lastFetchTime = new Date()
  }

  let pending: number

  function schedule () {
    const now = new Date()
    const nextFetchTime = lastFetchTime
      ? Number(lastFetchTime) + fetchInterval
      : Number(now)
    const delay = Math.max(0, nextFetchTime - now)

    pending = setTimeout(() => {
      lastFetchTime = new Date()
      fetch(boxes, timeFrame, connectionFactory, db)
        .onError(console.error)
        .onEnd(onNewMail)
      schedule()
    }, delay)
  }
  schedule()

  return function terminate () {
    clearTimeout(pending)
  }
}

// TODO: subscribe to new messages using IDLE

function fetch (
  boxes: BoxName[],
  timeFrame: number,
  cf: ConnectionFactory,
  db: PouchDB
): Observable<void, mixed> {
  const now = new Date()
  const since = new Date(Number(now) - timeFrame)

  const connObs = kefir.fromPromise(cf())

  // Queue up a fetch operation for each box - but make sure these don't start
  // yet, because we are reusing one connection for everything,
  // and AFAIK we cannot open multiple boxes at the same time.
  const boxsObss = boxes.map(box =>
    connObs.flatMap(
      conn => fetchFromBox(box, since, conn, db).map(_ => conn) // forward reference to `conn`
    )
  )

  // Run the fetches for each box, one box at a time.
  return kefir.concat(boxsObss).last().map(conn => conn.end()) // close the connection after all fetches are complete
}

/*
 * Fetch data on recent messages from the given box, store results in database
 */
function fetchFromBox (
  boxName: BoxName,
  since: Date,
  conn: Connection,
  db: PouchDB
): Observable<void, mixed> {
  // TODO: redesign sync
  return kefir.constant(undefined)
  // // TODO: fetch any messages referenced by recent messages
  // return kefir
  //   .fromPromise(imaputil.openBox(boxName, true, conn))
  //   .flatMap(box =>
  //     kefir
  //       .fromPromise(persist.persistBoxMetadata(box, db))
  //       .flatMap(_ =>
  //         actions
  //           .fetchRecent(since, box, conn)
  //           .flatMap(message =>
  //             kefir
  //               .fromPromise(persist.persistMessage(message, db))
  //               .flatMap(_ => fetchParts(message, box, conn, db))
  //           )
  //       )
  //   )
  //   .beforeEnd(() =>
  //     kefir.fromPromise(promises.lift0(cb => conn.closeBox(false, cb)))
  //   )
  //   .last()
  //   .map(_ => undefined)
}

// function fetchParts (
//   message: Message,
//   box: Box,
//   conn: Connection,
//   db: PouchDB
// ): Observable<string, mixed> {
//   return kefir
//     .sequentially(0, message.parts)
//     .filter(part => !!part.partID) // TODO: skip parts with no ID
//     .filter(part => !!part.subtype) // skip multipart parts
//     .flatMap(part =>
//       kefir.fromPromise(
//         actions
//           .fetchMessagePart(message, part.partID || '', box, conn)
//           .then(data => persist.persistPart(db, message, part, data))
//           .then(_ => message.uriForPart(part))
//       )
//     )
// }

function noop () {}
