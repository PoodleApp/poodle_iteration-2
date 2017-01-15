/* @flow */

import {
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql'

import Connection                    from 'imap'
import * as imaputil                 from '../util/imap'
import { queryType as boxQueryType } from './box'

export default new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      box: {
        type: boxQueryType,
        description: 'An individual mailbox on an IMAP server',
        args: {
          attribute: {
            type: new GraphQLNonNull(GraphQLString),
            description: 'Find a box with a given attribute - e.g. `\\All`',
          }
        },
        resolve(root, args, context) {
          const conn: Connection = context.conn
          if (args.attribute) {
            return imaputil.openBox(
              imaputil.boxByAttribute(args.attribute), true, conn
            )
          }
        },
      },
    },
  })
})
