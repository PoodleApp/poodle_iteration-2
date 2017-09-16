/*
 * IMAP queries that are only possible with `X-GM-EXT-1` IMAP extensions
 *
 * @flow
 */

import Conversation from 'arfe/lib/models/Conversation'
import Message from 'arfe/lib/models/Message'
import { type URI } from 'arfe/lib/models/uri'
import { immutable as unique } from 'array-unique'
import * as imap from 'imap'
import * as kefir from 'kefir'
import type PouchDB from 'pouchdb-node'
import * as basic from './basic'
import * as capabilities from '../capabilities'
import * as C from '../models/connection'
import * as promises from '../util/promises'
import * as kefirUtil from '../util/kefir'

import type { Box, UID } from 'imap'
import type { Observable } from 'kefir'
import type { Thread } from '../models/Thread'

opaque type ThreadId = string

// TODO: do some caching to avoid a request to fetch boxes every time we open
// `\All`

export function query (
  query: string,
  openBox: C.OpenBox
): kefir.Observable<imap.UID[], Error> {
  if (!openBox.connection.serverSupports(capabilities.googleExtensions)) {
    return kefir.constantError(
      Error('Cannot search all mail because server does not support X-GM-EXT-1')
    )
  }
  return kefir.fromPromise(basic.search([['X-GM-RAW', query]], openBox))
}

/*
 * Search for conversations using a Gmail search query. Downloads results, and
 * emits a Gmail thread ID for each conversation.
 */
export function queryConversations (
  opts: {
    limit?: ?number,
    query: string
  },
  connection: C.Connection,
  db: PouchDB
): kefir.Observable<ThreadId, Error> {
  return C.withAllMail(connection, true, openBox => {
    const allThreadIds = query(opts.query, openBox).flatMap(
      uids => kefirUtil.batch(100, uids, uids => getThreadIds(uids, openBox))
    )
    return kefirUtil.takeAll(allThreadIds).flatMap(threadIds => {
      const distinct: string[] = unique(threadIds)
      const threadsToFetch = opts.limit ? distinct.slice(0, opts.limit) : distinct
      // Run each fetch sequentially because we are using a single connection
      return kefirUtil.sequence(threadsToFetch, threadId =>
        downloadThread(threadId, openBox, db)
        .ignoreValues()
        .beforeEnd(() => threadId)
      )
    })
  })
}

function getThreadIds (uids: imap.UID[], openBox: C.OpenBox): kefir.Observable<ThreadId, Error> {
  // The imap library will fetch 'x-gm-thrid' by default. We limit the bodies to
  // one header to fetch as little data as possible, because 'x-gm-thrid' is the
  // only thing we really want.
  const threadIds = basic.fetch(uids, { bodies: 'HEADER.FIELDS (Message-ID)' }, openBox)
    .flatMap(basic.getAttributes)
    .map(attributes => attributes['x-gm-thrid'])
  return kefirUtil.catMaybes(threadIds)
}

/*
 * Downloads a conversation thread using Google's proprietary thread ID IMAP
 * extension; emits IDs of PouchDB records for downloaded messages
 */
function downloadThread (threadId: ThreadId, openBox: C.OpenBox, db: PouchDB): kefir.Observable<URI, Error> {
  return kefir.fromPromise(basic.search([['X-GM-THRID', threadId]], openBox))
    .flatMap(uids => basic.downloadMessages(uids, openBox, db))
}
