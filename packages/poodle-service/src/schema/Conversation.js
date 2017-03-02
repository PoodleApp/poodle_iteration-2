/* @flow */

import ArfeConversation    from 'arfe/lib/models/Conversation'
import * as graphql        from 'graphql'
import { GraphQLDateTime } from 'graphql-iso-date'
import Connection          from 'imap'
import * as m              from 'mori'
import { searchByThread }  from '../actions/google'
import Activity            from './Activity'
import Address             from './Address'
import LanguageValue       from './LanguageValue'

import type { Seqable }      from 'mori'
import type { ActivityData } from './Activity'

export type ConversationData = {
  conn:         Connection,
  conversation: ArfeConversation,
}

export default new graphql.GraphQLObjectType({
  name: 'Conversation',
  description: 'Activities derived from a message thread according to the ARFE protocol',
  fields: {
    id: {
      type: new graphql.GraphQLNonNull(graphql.GraphQLString),
      description: 'URI of the first message in the conversation',
      resolve({ conversation }: ConversationData) { return conversation.id },
    },
    lastActiveTime: {
      type: GraphQLDateTime,
      description: 'Time and date of latest activity in the conversation',
      resolve({ conversation }: ConversationData) {
        return conversation.lastActiveTime.toDate()
      },
    },
    participarts: {
      type: new graphql.GraphQLList(Address),
      description: 'People or entities who have sent or received activities in the conversation',
      resolve({ conversation }: ConversationData) {
        return m.intoArray(conversation.flatParticipants)
      }
    },
    subject: {
      type: LanguageValue,
      description: 'Subject line of the message thread',
      resolve({ conversation }: ConversationData) { return conversation.subject },
    },
    activities: {
      type: new graphql.GraphQLList(new graphql.GraphQLNonNull(Activity)),
      description: 'Activities in activitystrea.ms 2.0 format',
      resolve({ conversation, conn }: ConversationData): ActivityData[] {
        return m.intoArray(m.map(
          activity => ({
            activity,
            conn,
            context: conversation.messages,
          }),
          conversation.activities
        ))
      },
    },
  },
})
