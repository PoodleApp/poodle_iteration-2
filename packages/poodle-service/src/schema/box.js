/* @flow */

import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import GraphQLDateTime from 'graphql-custom-datetype'

import Connection                               from 'imap'
import { fetchRecent }                          from '../actions'
import { fetchMessage, search, searchByThread } from '../actions/google'
import * as kefirutil                           from '../util/kefir'

import type { Box as ImapBox } from 'imap'
import { Message }             from './message'

const Messages = new GraphQLList(new GraphQLNonNull(Message))
const Threads  = new GraphQLList(new GraphQLNonNull(Messages))

export const Box = new GraphQLObjectType({
  name: 'Box',
  description: 'A mailbox on an IMAP server',
  fields: {
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
          )
        }

        const since: ?Date = args.since
        if (since) {
          // TODO: could these be streamed?
          return kefirutil.takeAll(
            fetchRecent(since, box, conn)
          )
        }
      },
    }
  },
})
