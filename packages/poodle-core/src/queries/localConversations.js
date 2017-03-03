/* @flow */

import gql from 'graphql-tag'

import type {
  ApolloData,
  LanguageValue,
  URI,
} from './types'

export type Conversation = {
  id: URI,
  lastActiveTime: string,
  participants: {
    displayName: string,
  }[],
  subject: LanguageValue,
}

export type LocalConversations = ApolloData & {
  conversations: Conversation[],
}

export const localConversations = gql`query LocalConvesations($lang: String!) {
  conversations(limit: 30) {
    id
    lastActiveTime
    participants {
      displayName
    }
    subject {
      get(lang: $lang)
    }
  }
}`
