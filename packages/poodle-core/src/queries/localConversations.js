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

export const localConversations = gql`query LocalConversations($labels: [String], $lang: String!, $since: String) {
  conversations(labels: $labels, limit: 30, since: $since) {
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
