/* @flow */

import gql from 'graphql-tag'

import type {
  ApolloData,
  URI,
} from './types'

export type Conversation = {
  id: URI,
  lastActiveTime: string,
  latestActivity: {
    actor: {
      id: URI,
      name: string,
    },
    contentSnippet: ?string,
  },
  participants: {
    displayName: string,
    email:       string,
  }[],
  subject: string,
}

export type LocalConversations = ApolloData & {
  conversations: Conversation[],
}

export const localConversations = gql`query LocalConvesations($lang: String!) {
  conversations(limit: 30) {
    id
    lastActiveTime
    latestActivity {
      actor {
        id
        name(lang: $lang)
      }
      contentSnippet(length: 200)
    }
    participants {
      displayName
      email
    }
    subject(lang: $lang)
  }
}`
