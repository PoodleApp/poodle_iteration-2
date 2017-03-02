/* @flow */

import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import { GraphQLDateTime } from 'graphql-iso-date'

import ArfeMessage                              from 'arfe/lib/models/Message'
import * as Conv                                from 'arfe/lib/models/Conversation'
import Connection                               from 'imap'
import { fetchMessagePart, fetchRecent }        from '../actions'
import { fetchMessage, search, searchByThread } from '../actions/google'
import * as kefirutil                           from '../util/kefir'
import Conversation                             from './Conversation'
import { Message }                              from './message'
import { Thread }                               from './thread'

import type { ReadStream }       from 'fs'
import type { Box as ImapBox }   from 'imap'
import type { ConversationData } from './Conversation'

const Conversations = new GraphQLList(new GraphQLNonNull(Conversation))
const Messages      = new GraphQLList(new GraphQLNonNull(Message))
const Threads       = new GraphQLList(new GraphQLNonNull(Thread))

export const Box = new GraphQLObjectType({
  name: 'Box',
  description: 'A mailbox on an IMAP server',
  fields: {
    conversations: {
      type: Conversations,
      descriptions: 'Activities derived from message threads according to the ARFE protocol',
      args: {
        search: {
          type: new GraphQLNonNull(GraphQLString),  // as the only argument, is required for now
          description: 'Gmail search query',
        },
      },
      async resolve([conn, box]: [Connection, ImapBox], args): Promise<ConversationData[]> {
        const query: ?string = args.search
        if (!query) {
          return Promise.reject(new Error('a `search` argument is required'))
        }

        const threads = await kefirutil.takeAll(
          searchByThread(query, box, conn)
        ).toPromise()

        function f(msg: ArfeMessage, partId: string): Promise<ReadStream> {
          return fetchMessagePart(msg, partId, conn)
        }

        const conversations = await Promise.all(threads.map(
          thread => Conv.messagesToConversation(f, thread.messages)
        ))

        return conversations.map(conversation => ({
          conversation,
          conn,
        }))
      }
    },

    messages: {
      type: Messages,
      description: 'Download messages from the given mailbox',
      args: {
        id: {
          type: GraphQLString,
          description: 'RFC 822 message ID',
        },
        search: {
          type: GraphQLString,
          description: 'Gmail search query',
        },
        since: {
          type: GraphQLDateTime,
          description: 'Find messages that were received after the given time',
        },
      },
      resolve([conn, box]: [Connection, ImapBox], args, context) {
        const id: ?string = args.id
        if (id) {
          return fetchMessage(id, box, conn).then(msg => [msg])
        }

        const query: ?string = args.search
        if (query) {
          // TODO: could these be streamed?
          return kefirutil.takeAll(
            search(query, box, conn)
          ).toPromise()
        }

        const since: ?Date = args.since
        if (since) {
          // TODO: could these be streamed?
          return kefirutil.takeAll(
            fetchRecent(since, box, conn)
          ).toPromise()
        }
      },
    },

    threads: {
      type: Threads,
      description: 'Download lists of messages related by `in-reply-to` and `references` headers (Gmail only)',
      args: {
        search: {
          type: new GraphQLNonNull(GraphQLString),  // as the only argument, is required for now
          description: 'Gmail search query',
        },
      },
      resolve([conn, box]: [Connection, ImapBox], args, context) {
        const query: ?string = args.search
        if (query) {
          return kefirutil.takeAll(
            searchByThread(query, box, conn)
          ).toPromise()
        }

        return []
      },
    },
  },
})
