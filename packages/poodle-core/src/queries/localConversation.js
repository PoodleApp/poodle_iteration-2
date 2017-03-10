/* @flow */

import gql from 'graphql-tag'

import type {
  ApolloData,
  URI,
} from './types'

export type Activity = {
  id: URI,
  actor: Actor,
  content: {
    asString: string,
    mediaType: string,
  },
  isEdited: boolean,
  latestEditTime: string,  // ISO 8601 date
  object: {
    types: URI[],
  },
  publishTime: string,  // ISO 8601 date
  revisions: {
    updateActivity: {
      actor: Actor,
    },
  }[],
}

export type Conversation = {
  id: URI,
  activities: Activity[],
  participants: {
    displayName: string,
    email:       string,
  }[],
  subject: string,
}

type Actor = {
  id:   URI,
  name: string,
}

export type LocalConversation = ApolloData & {
  conversations: Conversation[],
}

export const localConversations = gql`query LocalConvesation($id: String!, $lang: String!) {
  conversation(id: $id) {
    id
    activities {
      id
      actor {
        id
        name(lang: $lang)
      }
      content {
        asString
        mediaType
      }
      isEdited
      latestEditTime
      object {
        types
      }
      publishTime
      revisions {
        updateActivity {
          actor {
            id
            name(lang: $lang)
          }
        }
      }
    }
    participants {
      displayName
      email
    }
    subject(lang: $lang)
  }
}`
