/* @flow */

import gql from 'graphql-tag'

import type {
  ApolloData,
  URI,
} from './types'

export type Activity = {
  id: URI,
  actor: Actor,
  aside: ?Conversation,
  content: {
    asString: string,
    mediaType: string,
  },
  isEdited: boolean,
  latestEditTime: string,  // ISO 8601 date
  likedBy: URI[],
  likeCount: number,
  object: {
    id:    URI,
    types: URI[],
  },
  publishTime: string,  // ISO 8601 date
  revisions: {
    updateActivity: {
      actor: Actor,
    },
  }[],
  types: URI[],
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
  conversation: ?Conversation,
}

export const localConversation = gql`
query LocalConvesation($id: String!, $lang: String!) {
  conversation(id: $id) {
    ...conversationFields
  }
}

fragment activityFields on Activity {
  id
  actor {
    ...actorFields
  }
  aside {
    ...conversationFields
  }
  content {
    asString
    mediaType
  }
  isEdited
  latestEditTime
  likedBy
  likeCount
  object {
    id
    types
  }
  publishTime
  revisions {
    id
    updateActivity {
      actor {
        ...actorFields
      }
    }
  }
  types
}

fragment actorFields on Actor {
  id
  name(lang: $lang)
}

fragment conversationFields on Conversation {
  id
  activities {
    ...activityFields
  }
  participants {
    displayName
    email
  }
  subject(lang: $lang)
}
`
