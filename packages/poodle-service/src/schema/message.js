/* @flow */

import {
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql'
import GraphQLDateTime from 'graphql-custom-datetype'

const Address = new GraphQLObjectType({
  name: 'Address',
  description: 'Represents data in email header fields, `to`, `from`, etc.',
  fields: {
    name: {
      type: GraphQLString,
      description: "E.g., person's full name",
    },
    mailbox: {
      type: GraphQLString,
      description: 'Username portion of email address',
    },
    host: {
      type: GraphQLString,
      description: 'host portion of email address',
    },
  },
})

const AddressList = new GraphQLList(new GraphQLNonNull(Address))

const Envelope = new GraphQLObjectType({
  name: 'Envelope',
  description: 'Metadata on an email message',
  fields: {
    date:      { type: GraphQLDateTime },
    subject:   { type: GraphQLString },
    from:      { type: AddressList },
    sender:    { type: AddressList },
    replyTo:   { type: AddressList },
    to:        { type: AddressList },
    cc:        { type: AddressList },
    bcc:       { type: AddressList },
    inReplyTo: { type: AddressList },
    messageId: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'RFC 822 message ID',
    },
  },
})

export const Message = new GraphQLObjectType({
  name: 'Message',
  description: 'A single email message',
  fields: {
    uid: {
      type: new GraphQLNonNull(GraphQLString),
    },
    flags: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      description: 'Possible values include "\\Seen", "\\Answered", "\\Flagged", "\\Deleted", "\\Draft"',
    },
    date: {
      type: new GraphQLNonNull(GraphQLDateTime),
    },
    envelope: {
      type: Envelope,
      description: 'Email metadata',
    },
    size: {
      type: GraphQLInt,
    },

    // TODO: these field names do not match the underlying property names
    xGmLabels: {
      type: new GraphQLList(new GraphQLNonNull(GraphQLString)),
      description: 'Gmail labels on the message',
      resolve: msg => msg['x-gm-labels'],
    },
    xGmThrid: {
      type: GraphQLString,
      description: 'ID of thread that message belongs to (Gmail only)',
      resolve: msg => msg['x-gm-thrid'],
    },
    xGmMsgid: {
      type: GraphQLString,
      description: 'ID of message (Gmail only)',
      resolve: msg => msg['x-gm-msgid'],
    },
  }
})
