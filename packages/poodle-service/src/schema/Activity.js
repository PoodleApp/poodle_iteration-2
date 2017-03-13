/* @flow */

import * as Conv                 from 'arfe/lib/models/Conversation'
import DerivedActivity, * as Drv from 'arfe/lib/models/DerivedActivity'
import Message, * as Msg         from 'arfe/lib/models/Message'
import * as AS                   from 'activitystrea.ms'
import * as graphql              from 'graphql'
import { GraphQLDateTime }       from 'graphql-iso-date'
import * as m                    from 'mori'
import toString                  from 'stream-to-string'
import { fetchMessagePart }      from '../actions'
import Actor                     from './Actor'
import AsObject                  from './AsObject'
import Conversation              from './Conversation'

import type { Readable }         from 'stream'
import type { ActorData }        from './Actor'
import type { ConversationData } from './Conversation'

export type ActivityData = {
  activity:     DerivedActivity,
  fetchContent: (uri: string) => Promise<Readable>,
}

type ContentData = {
  asString:  string,
  mediaType: string,
}

const URI = new graphql.GraphQLNonNull(graphql.GraphQLString)

const Content = new graphql.GraphQLObjectType({
  name: 'Content',
  description: 'Activity content, with media type',
  fields: {
    asString: {
      type: new graphql.GraphQLNonNull(graphql.GraphQLString),
      description: 'The actual content',
    },
    mediaType: {
      type: new graphql.GraphQLNonNull(graphql.GraphQLString),
      description: 'MIME type of content',
    },
  },
})

const Revision = new graphql.GraphQLObjectType({
  name: 'Revision',
  description: 'A snapshot of some revision of an activity, paired with the activity that produced the revision',
  fields: () => ({
    id: {
      type: new graphql.GraphQLNonNull(graphql.GraphQLString),
      description: 'Universally unique ID of revision',
      resolve({ revision }) { return revision.id },
    },
    revision: {
      type: new graphql.GraphQLNonNull(Activity),
      description: 'The activity itself at a particular revision',
    },
    updateActivity: {
      type: Activity,
      description: 'The activity of type `Update` that produced the revision',
    },
  }),
})

const Activity = new graphql.GraphQLObjectType({
  name: 'Activity',
  description: 'Structured Activitystrea.ms 2.0 data carried by an email message',
  fields: () => ({
    actor: {
      type: Actor,
      description: 'Person or entity performing the activity',
      resolve({ activity }: ActivityData): ?ActorData {
        return activity.actor
      },
    },
    aside: {
      type: Conversation,
      description: 'Nested conversation between a subset of participants',
      resolve({ activity, fetchContent }: ActivityData): ?ConversationData {
        if (activity.hasType(Drv.syntheticTypes.Aside)) {
          const conversation = Conv.asideToConversation(activity)
          return { conversation, fetchContent }
        }
      },
    },
    content: {
      type: Content,
      description: 'Content of linked object',
      resolve({ activity, fetchContent }: ActivityData): Promise<ContentData> {
        return fetchActivityContent(activity, fetchContent)
      },
    },
    contentSnippet: {
      type: graphql.GraphQLString,
      description: 'A short preview of activity content',
      args: {
        length: {
          type: graphql.GraphQLInt,
          description: 'Number of characters to grab for snippet',
        },
      },
      async resolve({ activity, fetchContent }: ActivityData, args): Promise<string> {
        const content = await fetchActivityContent(
          activity, fetchContent, ['text/plain', 'text/html']
        )
        return content.asString.slice(0, args.length || 100)
      },
    },
    id: {
      type: new graphql.GraphQLNonNull(graphql.GraphQLString),
      description: 'Universally unique ID of activity',
      resolve({ activity }: ActivityData) { return activity.id },
    },
    isEdited: {
      type: graphql.GraphQLBoolean,
      description: 'Indicates whether this activity has been edited',
      resolve({ activity }: ActivityData) { return activity.isEdited },
    },
    hasType: {
      type: graphql.GraphQLBoolean,
      description: 'True if the activity has the given type',
      args: {
        type: {
          type: URI,
          description: 'An activity type, identified by URI',
        },
      },
      resolve({ activity }: ActivityData, args): boolean {
        return activity.hasType(args.type)
      },
    },
    latestEditTime: {
      type: GraphQLDateTime,
      description: 'Time and date when the activity was last edited',
      resolve({ activity }: ActivityData) {
        const time = activity.latestEditTime
        return time && time.toDate()
      },
    },
    likeCount: {
      type: graphql.GraphQLInt,
      description: 'Number of likes on an activity',
      resolve({ activity }: ActivityData) { return activity.likeCount },
    },
    likedBy: {
      type: new graphql.GraphQLList(graphql.GraphQLString),
      description: 'List of URIs of actors who like this activity',
      resolve({ activity }: ActivityData) {
        return m.intoArray(m.keys(activity.likes))
      },
    },
    object: {
      type: AsObject,
      description: 'Object with properties defined by activitystrea.ms v2 spec',
      resolve({ activity }: ActivityData) { return activity.object },
    },
    publishTime: {
      type: GraphQLDateTime,
      description: 'Time and date when the activity was received',
      resolve({ activity }: ActivityData) {
        const time = activity.publishTime
        return time && time.toDate()
      },
    },
    revisions: {
      type: new graphql.GraphQLList(new graphql.GraphQLNonNull(Revision)),
      description: 'Previous revisions of this activity (if it has been updated) ordered from most recent to original',
      resolve({ activity }: ActivityData) { return m.intoArray(activity.revisions) },
    },
    types: {
      type: new graphql.GraphQLList(URI),
      description: 'Type or types of activity that this data represents',
      resolve({ activity }: ActivityData) { return activity.types },
    },
  }),
})

export default Activity

async function fetchActivityContent(
  activity: DerivedActivity,
  fetchContent: (uri: string) => Promise<Readable>,
  preferences: string[] = ['text/html', 'text/plain']
): Promise<ContentData> {
  const links = m.mapcat(
    pref => m.filter(l => l.mediaType === pref, activity.objectLinks),
    preferences
  )
  const link = m.first(links)

  if (!link) {
    throw new Error(`could not find html or text content for activity ${activity.id}`)
  }

  const href = link.href
  if (!href) {
    throw new Error(`object link does not have an \`href\` property in activity ${activity.id}`)
  }

  const stream = await fetchContent(link.href)
  return {
    asString:  await toString(stream, 'utf8'),  // TODO: check charset
    mediaType: link.mediaType,
  }
}
