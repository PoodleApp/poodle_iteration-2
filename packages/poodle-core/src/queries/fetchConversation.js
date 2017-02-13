/* @flow */

import gql from 'graphql-tag'

import type {
  ApolloData,
  LanguageValue,
  URI,
} from './types'

export type FetchConversationData = ApolloData & {
  allMail: {
    conversations: {
      id: URI,
      participants: {
        displayName: string,
      }[],
      subject: LanguageValue,
      activities: Activity[],
    }[],
  },
}

type Activity = {
  actor: {
    id:   URI,
    name: LanguageValue,
  },
  content: ?{
    asString:  string,
    mediaType: string,
  },
  isEdited:    boolean,
  likeCount:   number,
  publishTime: string,
  types:       URI[],
}

export const fetchConversation = gql`query FetchConversation($query: String!) {
  allMail: box(attribute: "\\\\All") {
    conversations(search: $query) {
      id
      subject {
        default: get
      }
      activities {
        actor {
          id
          name { get }
        }
        content {
          asString
          mediaType
        }
        isEdited
        likeCount
        publishTime
        types
      }
    }
  }
}`

export function lang(tag: string, value: LanguageValue): ?string {
  return value[tag]
}
