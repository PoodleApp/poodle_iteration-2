/*
 * IMAP queries that are only possible with `X-GM-EXT-1` IMAP extensions
 *
 * @flow
 */

import * as kefir        from 'kefir'
import Connection        from 'imap'
import * as capabilities from '../capabilities'
import * as promises     from '../util/promises'
import * as basic        from './index'

import type {
  Box,
  UID,
} from 'imap'
import type { Observable } from 'kefir'
import type { Message } from '../models/Message'

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

// TODO: check cache for each uid
export function fetchConversations(
  uids: UID[],
  box: Box,
  conn: Connection,
  limit: number = 0
): Observable<Message[], mixed> {
  if (!conn.serverSupports(capabilities.googleExtensions)) {
    return kefir.constantError(
      new Error('cannot fetch a message by ID because server does not support X-GM-EXT-1')
    )
  }

  const uids_ = limit > 0 ? uids.slice(0, limit) : uids
  const threadIds = fetchThreadIds(uids_, box, conn)
  return threadIds.flatMap(tIds => {
    const threadStreams = tIds.map(
      threadId => fetchConversation(threadId, box, conn)
    )
    return kefir.merge(threadStreams)
  })
}

function fetchThreadIds(uids: UID[], box: Box, conn: Connection): Observable<string[], mixed> {
  return basic.fetchMessages(uids, {/* metadata only */}, conn)
    .flatMap(message => basic.getAttributes(message))
    .scan(
      (tIds: Set<string>, msgAttrs) => {
        const threadId = msgAttrs['x-gm-thrid']
        if (!threadId) {
          // TODO: reflect error in returned Observable
          throw new Error(`attribute \`x-gm-thrid\` is missing: ${JSON.stringify(msgAttrs)}`)
        }
        return tIds.add(threadId)
      },
      new Set
    )
    .last()
    .map(set => Array.from(set.values()))
}

function fetchConversation(threadId: string, box: Box, conn: Connection): Observable<Message[], mixed> {
  return basic.fetchMessages([['X-GM-THRID', threadId]], { bodies: [''] }, conn)
    .flatMap(basic.getAttributes)
    .scan(
      (thread: Message[], message: Message) => { thread.push(message); return thread },
      ([]: Message[])
    )
    .last()
}
