/* @flow */

import * as graphql           from 'graphql'
import { GraphQLDateTime }    from 'graphql-iso-date'
import Connection             from 'imap'
import Sync                   from '../sync'
import * as imaputil          from '../util/imap'
import * as kefirutil         from '../util/kefir'
import { Box }                from './box'
import Conversation           from './Conversation'

import type { ConversationData } from './Conversation'

const Conversations = new graphql.GraphQLList(new graphql.GraphQLNonNull(Conversation))
const ListOfStrings = new graphql.GraphQLList(new graphql.GraphQLNonNull(graphql.GraphQLString))

/*
 * GraphQL schema for IMAP interface
 *
 * Requires a connection factory function in context.
 * It should have the type:
 *
 *     () => Promise<Connection>
 *
 */
export default new graphql.GraphQLSchema({
  query: new graphql.GraphQLObjectType({
    name: 'Root',
    fields: {
      box: {
        type: Box,
        description: 'An individual mailbox on an IMAP server',
        args: {
          attribute: {
            type: new graphql.GraphQLNonNull(graphql.GraphQLString),
            description: 'Find a box with a given attribute - e.g. `\\All`',
          }
        },
        async resolve(root, args, context) {
          // TODO: Get `connectionFactory` from `context` or `root`?
          const cf: () => Promise<Connection> = context.connectionFactory

          if (args.attribute) {
            const conn = await cf()
            const box  = await imaputil.openBox(
              imaputil.boxByAttribute(args.attribute), true, conn
            )
            return [conn, box]  // pass connection with box
          }
        },
      },
      conversation: {
        type: Conversation,
        descriptions: 'Activities derived from message threads according to the ARFE protocol',
        args: {
          id: {
            type: new graphql.GraphQLNonNull(graphql.GraphQLString),
            description: 'ID of conversation to load',
          },
        },
        async resolve(sync: Sync, args): Promise<ConversationData> {
          const conversation = await sync.getConversation(args.id)
          const fetchContent = sync.fetchPartContent.bind(sync)
          return { conversation, fetchContent }
        },
      },
      conversations: {
        type: Conversations,
        descriptions: 'Activities derived from message threads according to the ARFE protocol',
        args: {
          since: {
            type: graphql.GraphQLString,
            description: 'Show messages received after this time (ISO 8601 format)',
          },
          labels: {
            type: ListOfStrings,
            description: 'Show messages with any of the given labels (Gmail only)',
          },
          limit: {
            type: graphql.GraphQLInt,
            description: 'Limit number of conversations returned',
          },
          mailingLists: {
            type: ListOfStrings,
            description: 'Show conversations from these mailing lists',
          },
          participants: {
            type: ListOfStrings,
            description: 'Show messages to or from these people',
          },
        },
        async resolve(sync: Sync, args, context): Promise<ConversationData[]> {
          const convs = await kefirutil.takeAll(
            sync.queryConversations(args)
          )
          .toPromise()

          const fetchContent = sync.fetchPartContent.bind(sync)

          return convs.map(
            conversation => ({ conversation, fetchContent })
          )
        },
      },
    },
  })
})
