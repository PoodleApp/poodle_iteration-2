/*
 * IMAP queries that are only possible with `X-GM-EXT-1` IMAP extensions
 *
 * @flow
 */

import Conversation, * as Conv from 'arfe/lib/models/Conversation'
import { type URI } from 'arfe/lib/models/uri'
import { immutable as unique } from 'array-unique'
import * as imap from 'imap'
import * as kefir from 'kefir'
import * as m from 'mori'
import * as B from '../models/BoxList'
import * as cache from '../cache/query'
import * as capabilities from '../capabilities'
import { type ThreadId } from '../types'
import * as kefirUtil from '../util/kefir'
import * as basic from './basic'
import { openBox } from './stateChanges'
import Task from './Task'

export function query (query: string): Task<imap.UID[]> {
  return basic
    .requireCapability(capabilities.googleExtensions)
    .flatMap(() => basic.search([['X-GM-RAW', query]]))
}

/*
 * Search for conversations using a Gmail search query. Resolves to a list of
 * conversations multiple times to provide results as quickly as possible.
 * Retrieves conversations from cache if possible; downloads fresh data via IMAP
 * in parallel. That means that a stale version of a conversation may appear in
 * results, but will be replaced by a fresh version on a subsequent resolution.
 */
export function queryConversations (opts: {
  limit?: ?number,
  query: string
}): Task<Conversation[]> {
  return accumulateById(queryConversationsAsStream(opts))
}

/*
 * Behaves like `queryConversations`, but includes a content snippet for each
 * conversation, and resolves with limited metadata for each conversation.
 */
export function queryConversationsForListView (opts: {
  limit?: ?number,
  query: string
}): Task<basic.ConversationListItem[]> {
  return accumulateById(
    queryConversationsAsStream(opts)
      // A conversation with only non-visible activities (likes, edits, etc.) will
      // effectively be empty, so let's not display it
      .filter(conversation => !m.isEmpty(conversation.activities))
      .flatMap(basic.processConversationForListView)
  )
}

/*
 * Helper function: emits one conversation at a time - but there might be
 * duplicates when the task retrieves a conversation from cache, and later
 * fetches a fresh version of the same conversation via IMAP.
 */
function queryConversationsAsStream (opts: {
  limit?: ?number,
  query: string
}): Task<Conversation> {
  return openAllMail()
    .flatMap(() => query(opts.query))
    .flatMap(uids => getThreadIds(uids))
    .modifyObservable(kefirUtil.takeAll)
    .flatMap(threadIds => {
      const distinct: string[] = unique(threadIds)
      const threadsToFetch = opts.limit
        ? distinct.slice(0, opts.limit)
        : distinct
      return Task.par(threadsToFetch.map(getConversationByThreadId))
    })
}

/*
 * Given a task that emits one conversation at a time, produces a task that
 * accumulates conversations, and emits every time another conversation is
 * ready. The advantage of this function is that it handles cases where multiple
 * versions of the same conversation (stale & fresh) come through the underlying
 * task.
 */
function accumulateById<T: { id: string }> (task: Task<T>): Task<T[]> {
  return task.modifyObservable(conversations =>
    conversations.scan(
      (cs, c) =>
        // Remove any stale versions of `c` from the list, then add `c`
        cs.filter(c_ => c_.id !== c.id).concat(c),
      []
    )
  )
}

// May resolve multiple times with the same conversation! This task attempts to
// retrieve the conversation from the local cache. It then contacts the IMAP
// server to check for new messages.
function getConversationByThreadId (threadId: ThreadId): Task<Conversation> {
  let alreadyGotResultFromServer = false
  const fromCache = getConversationByThreadIdFromCache(threadId).map(
    conv => (alreadyGotResultFromServer ? undefined : conv)
  )
  const fromServer = downloadThread.flatMap(() => fromCache).map(conv => {
    alreadyGotResultFromServer = true
    return conv
  })
  return Task.par([fromCache, fromServer]).catMaybes()
}

function getConversationByThreadIdFromCache (
  threadId: ThreadId
): Task<?Conversation> {
  return Task.promisify(basic.fetchPartContent).flatMap(fetchPartContent => {
    return basic
      .dbTask(db =>
        kefir.fromPromise(cache.getMessagesByThreadId(threadId, db))
      )
      .flatMap(messages => {
        if (messages.length < 1) {
          return Task.result(undefined)
        }
        return Task.liftPromise(
          Conv.messagesToConversation(fetchPartContent, messages)
        )
      })
  })
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
function downloadThread (threadId: ThreadId): Task<void> {
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
