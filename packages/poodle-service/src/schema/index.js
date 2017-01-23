/* @flow */

import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql'

import Connection    from 'imap'
import * as imaputil from '../util/imap'
import { Box }       from './box'

/*
 * GraphQL schema for IMAP interface
 *
 * Requires a connection factory function in context.
 * It should have the type:
 *
 *     () => Promise<Connection>
 *
 */
export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Root',
    fields: {
      box: {
        type: Box,
        description: 'An individual mailbox on an IMAP server',
        args: {
          attribute: {
            type: new GraphQLNonNull(GraphQLString),
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
    },
  })
})
