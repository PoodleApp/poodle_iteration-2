/* @flow */

import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import GraphQLDateTime from 'graphql-custom-datetype'

import * as arfethread                          from 'arfe/models/thread'
import * as arfeconv                            from 'arfe/conversation'
import Connection                               from 'imap'
import { fetchRecent }                          from '../actions'
import { fetchMessage, search, searchByThread } from '../actions/google'
import * as kefirutil                           from '../util/kefir'
import { Message }                              from './message'
import { Thread }                               from './thread'

import type { Box as ImapBox } from 'imap'

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
      async resolve([conn, box]: [Connection, ImapBox], args, context) {
        const query: ?string = args.search
        if (query) {
          const messages = await kefirutil.takeAll(
            searchByThread(query, box, conn)
          ).toPromise()
          const thread = arfethread.buildThread(messages)
        }
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
