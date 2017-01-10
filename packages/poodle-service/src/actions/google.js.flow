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

// // TODO: check cache for each uid
// function fetchConversations(uids: UID[], box: Box, conn: Connection): Observable<Message[], mixed> {
//   if (!conn.serverSupports(capabilities.googleExtensions)) {
//     return kefir.constantError(
//       new Error('cannot fetch a message by ID because server does not support X-GM-EXT-1')
//     )
//   }

//   const threadIds = basic.fetchMessages(uids, {/* metadata only */}, conn)
//   .flatMap(message => basic.getAttributes(message))
//   .scan(
//     (ids, msgAttrs) => {
//       const id = msgAttrs['x-gm-thrid']
//       return id ? ids.add(id) : ids
//     },
//     new Set
//   )
//   .last()

//   return threadIds.flatMap(ids => {
//     const threadStreams = Array.from(ids).map(
//       id => _searchAllMail([['X-GM-THRID', id]], conn).scan(
//         (thread, message) => thread.concat(message), []
//       )
//       .last()
//     )
//     return kefir.merge(threadStreams)
//   })
// }
