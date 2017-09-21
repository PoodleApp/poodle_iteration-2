/*
 * IMAP queries that are only possible with `X-GM-EXT-1` IMAP extensions
 *
 * @flow
 */

import { type URI } from 'arfe/lib/models/uri'
import { immutable as unique } from 'array-unique'
import * as imap from 'imap'
import * as B from '../models/BoxList'
import * as capabilities from '../capabilities'
import { type ThreadId } from '../types'
import * as kefirUtil from '../util/kefir'
import * as basic from './basic'
import { openBox } from './stateChanges'
import Task from './Task'

// TODO: do some caching to avoid a request to fetch boxes every time we open
// `\All`

export function query (query: string): Task<imap.UID[]> {
  return basic
    .requireCapability(capabilities.googleExtensions)
    .flatMap(() => basic.search([['X-GM-RAW', query]]))
}

/*
 * Search for conversations using a Gmail search query. Downloads results, and
 * emits a Gmail thread ID for each conversation.
 */
export function queryConversations (opts: {
  limit?: ?number,
  query: string
}): Task<ThreadId> {
  return openAllMail().flatMap(() =>
    query(opts.query).flatMap(threadIds => {
      const distinct: string[] = unique(threadIds)
      const threadsToFetch = opts.limit
        ? distinct.slice(0, opts.limit)
        : distinct
      return Task.par(
        threadsToFetch.map(threadId =>
          downloadThread(threadId).modifyObservable(obs =>
            obs.ignoreValues().beforeEnd(() => threadId)
          )
        )
      )
    })
  )
}

function getThreadIds (uids: imap.UID[]): Task<ThreadId> {
  // The imap library will fetch 'x-gm-thrid' by default. We limit the bodies to
  // one header to fetch as little data as possible, because 'x-gm-thrid' is the
  // only thing we really want.
  // TODO: is there a way to request nothing extra here?
  const threadIds = basic
    .fetch(uids, { bodies: 'HEADER.FIELDS (Message-ID)' })
    .flatMap(msg => Task.lift(basic.getAttributes(msg)))
    .map(attributes => attributes['x-gm-thrid'])
  return threadIds.modifyObservable(kefirUtil.catMaybes)
}

/*
 * Downloads a conversation thread using Google's proprietary thread ID IMAP
 * extension; emits IDs of PouchDB records for downloaded messages
 */
function downloadThread (threadId: ThreadId): Task<URI> {
  return basic
    .search([['X-GM-THRID', threadId]])
    .flatMap(uids => basic.downloadMessages(uids))
}

export function openAllMail (readonly: boolean = true): Task<void> {
  return basic.getBoxes().flatMap(boxList => {
    const boxData = B.findBox(B.byAttribute('\\All'), boxList)
    if (!boxData) {
      return Task.error(new Error('Unable to find "All Mail" box'))
    }
    const name = boxData.name
    return openBox({ name }, readonly)
  })
}
