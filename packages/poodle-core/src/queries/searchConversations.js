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

export type SearchConversationsData = ApolloData & {
  allMail: {
    conversations: Conversation[],
  },
}

export const searchConversations = gql`query SearchConversations($query: String!) {
  allMail: box(attribute: "\\\\All") {
    conversations(search: $query) {
      id
      lastActiveTime
      participants {
        displayName
      }
      subject {
        default: get
      }
    }
  }
}`

export function lang(tag: string, value: LanguageValue): ?string {
  return value[tag]
}
