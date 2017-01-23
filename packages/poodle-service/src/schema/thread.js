/* @flow */

import {
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import { Message } from './message'

const String = new GraphQLNonNull(GraphQLString)

export const Thread = new GraphQLObjectType({
  name: 'Thread',
  description: 'List of email messages that are related by `in-reply-to` and `references` headers (Gmail only)',
  fields: {
    id: {
      type: String,
      description: 'Thread ID assigned by Gmail; unique within an email account',
    },
    messages: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Message))),
    },
  },
})
