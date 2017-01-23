/*
 * IMAP queries that are only possible with `X-GM-EXT-1` IMAP extensions
 *
 * @flow
 */

import * as kefir        from 'kefir'
import Connection        from 'imap'
import * as basic        from './index'
import * as capabilities from '../capabilities'
import * as promises     from '../util/promises'
import * as kefirutil    from '../util/kefir'

import type {
  Box,
  UID,
} from 'imap'
import type { Observable } from 'kefir'
import type { Message }    from '../models/Message'
import type { Thread }     from '../models/Thread'

// Works best with the `\\All` box provided in Gmail
export async function fetchMessage(msgid: string, box: Box, conn: Connection): Promise<Message> {
  if (!conn.serverSupports(capabilities.googleExtensions)) {
    return Promise.reject(
      new Error('cannot fetch a message by ID because server does not support X-GM-EXT-1')
    )
  }

  return search(`rfc822msgid:${msgid}`, box, conn).take(1).toPromise()
}

export function search(query: string, box: Box, conn: Connection): Observable<Message, mixed> {
  if (!conn.serverSupports(capabilities.googleExtensions)) {
    return kefir.constantError(
      Error('cannot search all mail because server does not support X-GM-EXT-1')
    )
  }

  return basic.search([['X-GM-RAW', query]], box, conn)
}

export function searchByThread(query: string, box: Box, conn: Connection): Observable<Thread, mixed> {
  if (!conn.serverSupports(capabilities.googleExtensions)) {
    return kefir.constantError(
      Error('cannot search all mail because server does not support X-GM-EXT-1')
    )
  }

  return basic.searchUids([['X-GM-RAW', query]], box, conn)
    .flatMap(uids => fetchThreads(uids, box, conn))
}

// TODO: check cache for each uid
function fetchThreads(
  uids: UID[],
  box: Box,
  conn: Connection,
  limit: number = 0
): Observable<Thread, mixed> {
  if (!conn.serverSupports(capabilities.googleExtensions)) {
    return kefir.constantError(
      new Error('cannot fetch a message by ID because server does not support X-GM-EXT-1')
    )
  }

  const uids_ = limit > 0 ? uids.slice(0, limit) : uids
  const threadIds = fetchThreadIds(uids_, box, conn)
  return threadIds.flatMap(threadId => fetchThread(threadId, box, conn))
}

function fetchThreadIds(uids: UID[], box: Box, conn: Connection): Observable<string, mixed> {
  return basic.fetchMessages(uids, {/* metadata only */}, conn)
    .flatMap(basic.getAttributes)
    .map(message => {
      const threadId = message['x-gm-thrid']
      if (!threadId) {
        // TODO: reflect error in returned Observable
        throw new Error(`attribute \`x-gm-thrid\` is missing: ${JSON.stringify(message)}`)
      }
      return threadId
    })
    .skipDuplicates()
}

function fetchThread(threadId: string, box: Box, conn: Connection): Observable<Thread, mixed> {
  const msgEvents = basic.searchUids([['X-GM-THRID', threadId]], box, conn)
    .flatMap(uids => basic.fetchMessages(uids, {
      envelope: true,
      struct:   true,
    }, conn))
    .flatMap(basic.getAttributes)

  return kefirutil.takeAll(msgEvents)
    .map(messages => ({ id: threadId, messages }))
}
