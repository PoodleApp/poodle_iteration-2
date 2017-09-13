/*
 * Functions to send requests to an ImapInterface over some channel.
 *
 * @flow
 */

import Conversation, * as Conv from 'arfe/lib/models/Conversation'
import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import Message from 'arfe/lib/models/Message'
import type EventEmitter from 'events'
import * as imap from 'imap'
import * as kefir from 'kefir'
import type PouchDB from 'pouchdb-node'
import { type Readable } from 'stream'
import * as cache from '../cache/query'
import * as capabilities from '../capabilities'
import { type ImapAccount } from '../models/ImapAccount'
import { type Thread } from '../models/Thread'
import { type AccountMetadata, type Email } from '../types'
import * as C from './channel'
import { type Action, accountAction, imapAction } from './actions'
import * as accountActions from './actions/account'
import * as imapActions from './actions/imap'
import * as constants from './constants'

export type Content = {
  content: string,
  mediaType: string
}

// TODO: `slurp` uses deep-equality checking to determine whether to re-execute
// a subscription. But ideally we want it to compare `Client` instances by
// reference.

export opaque type Client = {
  accounts: kefir.Observable<AccountMetadata[]>,
  accountMetadata: { [key: Email]: AccountMetadata },
  channel: EventEmitter,
  db: PouchDB
}

export function NewClient (channel: EventEmitter, db: PouchDB): Client {
  const accountMetadata = {}

  /*
   * Lists connected IMAP accounts. This observable never ends - it emits an
   * up-to-date list every time an account is added or removed.
   */
  const accounts: kefir.Observable<
    AccountMetadata[]
  > = kefir.stream(emitter => {
    function listener (value: AccountMetadata[]) {
      for (const account of value) {
        accountMetadata[account.email] = account
      }
      emitter.value(value)
    }
    channel.addListener(constants.ACCOUNT_LIST, listener)

    // Request up-to-date list from Server
    C.request(accountAction(accountActions.list()), channel)

    return function unsubscribe () {
      channel.removeListener(constants.ACCOUNT_LIST, listener)
    }
  })

  return {
    accounts,
    accountMetadata,
    channel,
    db
  }
}

export function accounts (client: Client): kefir.Observable<AccountMetadata[]> {
  return client.accounts
}

export function activityContent (
  activity: DerivedActivity,
  accountName: Email,
  client: Client
): kefir.Observable<?Content> {
  return kefir.constantError(new Error('TODO: activityContent')) // TODO
}

export function activityContentSnippet (
  activity: DerivedActivity,
  accountName: Email,
  client: Client
): kefir.Observable<?Content> {
  return kefir.constantError(new Error('TODO: activityContentSnippet')) // TODO
}

export function addAccount (account: ImapAccount, client: Client): kefir.Observable<void> {
  return request(accountAction(accountActions.add(account)), client)
}

export function query (opts: {
  account: Email,
  query: string
}, client: Client): kefir.Observable<Conversation, Error> {
  const action = imapAction(imapActions.queryConversations({ query: opts.query }), opts.account)
  return request(action, client)
    .flatMap(threadId => kefir.fromPromise(getConversationByThreadId({
      account: opts.account,
      threadId
    }, client)))
}

async function getConversationByThreadId (
  opts: { account: Email, threadId: string },
  client: Client
): Promise<Conversation> {
  const messages = await cache.getMessagesByThreadId(opts.threadId, client.db)
  return Conv.messagesToConversation(fetchPartContent(opts.account, client), messages)
}

function fetchPartContent (
  account: Email,
  client: Client
): (msg: Message, contentId: string) => Promise<Readable> {
  const fetchFromCache = cache.fetchPartContent.bind(null, client.db)
  return async (msg, contentId) => {
    try {
      return await fetchFromCache(msg, contentId)
    } catch (_) {}
    // TODO: check uid validity
    const box = Object.keys(msg.perBoxMetadata || {})[0]
    const uid = box && msg.perBoxMetadata[box].uid
    if (!box || !uid) {
      throw new Error(`Cannot fetch part content for message with no UID, ${msg.id}`)
    }
    const action = imapAction(imapActions.fetchPart({
      box,
      messageId: msg.id,
      part: msg.getPart({ contentId }),
      uid
    }), account)
    await request(action, client).toPromise()
    return fetchFromCache(msg, contentId)
  }
}

// export function conversationByUid (opts: {
//   account: Email,
//   box: string,
//   uid: imap.UID
// }, client: Client): kefir.Observable<Conversation, Error> {
//   // Try to get the conversation from the cache
//   // TODO:
// }

// function fetchThread (opts: {
//   account: Email,
//   box: string,
//   uid: imap.UID
// }, client: Client): kefir.Observable<Thread, Error> {
//   if (hasCapability({ account: opts.account, capability: capabilities.googleExtensions }, client)) {
//     return fetchThreadGmail(opts, client)
//   } else {
//     return kefir.constantError(
//       new Error('Fetching conversations is not currently implemented for your email provider')
//     )
//   }
// }

// function fetchThreadGmail (opts: {
//   account: Email,
//   box: string,
//   uid: imap.UID,

// }, client: Client): kefir.Observable<Thread, Error> {
//   request(imapAction(imapActions.fetch({
//     box: opts.box,
//     // source:
//   })), client)
// }

// export function search (opts: {
//   account: Email,
//   box?: string,
//   criteria?: mixed[],
//   query?: string
// }, client: Client): kefir.Observable<Conversation, Error> {
//   // TODO: search by threads if server has `THREAD=REFERENCES` capability
//   const criteria = opts.criteria || buildCriteria(opts, client)
//   if (criteria instanceof Error) {
//     return kefir.constantError(criteria)
//   }
//   const box = opts.box || '\\All' // TODO: check server support for \All box
//   return request(imapAction(imapActions.search({ box, criteria }), opts.account), client)
//     .flatMap(uids => kefir.sequentially(0, uids))
//     .flatMap(uid => conversationByUid({ account: opts.account, box, uid }, client))
//   // TODO: the `box` argument in the above line needs to be a fully-qualified
//   // path
// }

// function buildCriteria (opts: { account: Email, query?: string }, client: Client): (mixed[] | Error) {
//   if (!opts.query) {
//     return new Error('No query given')
//   }
//   if (hasCapability({ account: opts.account, capability: capabilities.googleExtensions }, client)) {
//     return [['X-GM-RAW', opts.query]]
//   } else {
//     throw new Error('Search is not yet supported for your mail provider')
//   }
// }

function hasCapability(opts: { account: Email, capability: string }, client: Client): ?boolean {
  const meta = client.accountMetadata[opts.account]
  if (meta) {
    return meta.capabilities.includes(opts.capability)
  }
}

function request<T> (action: Action, client: Client): kefir.Observable<T> {
  return C.request(action, client.channel)
}
