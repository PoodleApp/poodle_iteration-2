/* @flow */

import DerivedActivity      from 'arfe/lib/models/DerivedActivity'
import Message, * as Msg    from 'arfe/lib/models/Message'
import * as AS              from 'activitystrea.ms'
import * as graphql         from 'graphql'
import { GraphQLDateTime }  from 'graphql-iso-date'
import Connection           from 'imap'
import * as m               from 'mori'
import toString             from 'stream-to-string'
import { fetchMessagePart } from '../actions'
import Actor                from './Actor'

import type { Seqable }   from 'mori'
import type { ActorData } from './Actor'

export type ActivityData = {
  activity: DerivedActivity,
  conn:     Connection,
  context:  Seqable<Message>,
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

export default new graphql.GraphQLObjectType({
  name: 'Activity',
  description: 'Structured Activitystrea.ms 2.0 data carried by an email message',
  fields: {
    actor: {
      type: Actor,
      description: 'Person or entity performing the activity',
      resolve({ activity }: ActivityData): ?ActorData {
        return activity.actor && { actor: activity.actor }
      },
    },
    content: {
      type: Content,
      description: 'Content of linked object',
      resolve({ activity, context, conn }: ActivityData): Promise<ContentData> {
        return fetchActivityContent(activity, context, conn)
      },
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
    likeCount: {
      type: graphql.GraphQLInt,
      description: 'Number of likes on an activity',
      resolve({ activity }: ActivityData) { return activity.likeCount },
    },
    publishTime: {
      type: GraphQLDateTime,
      description: 'Time and date when the activity was received',
      resolve({ activity }: ActivityData) { return activity.publishTime.toDate() },
    },
    types: {
      type: new graphql.GraphQLList(URI),
      description: 'Type or types of activity that this data represents',
      resolve({ activity }: ActivityData) { return activity.types },
    },
  },
})

function fetchActivityContent(
  activity: DerivedActivity,
  context: Seqable<Message>,
  conn: Connection,
): Promise<ContentData> {
  const links = activity.objectLinks
  const html  = m.first(m.filter(l => l.mediaType === 'text/html', links))
  const text  = m.first(m.filter(l => l.mediaType === 'text/plain', links))

  const link  = html || text
  if (link) {
    return fetchLinkedContent(link, context, conn)
  }
  else {
    return Promise.reject(new Error(`could not find html or text content for activity ${activity.id}`))
  }
}

// TODO: Support content that is not embedded within a message (e.g., `https:` URI)
async function fetchLinkedContent(
  link: AS.models.Link,
  context: Seqable<Message>,
  conn: Connection
): Promise<ContentData> {
  const parsed = Msg.parseMidUri(link.href)
  if (!parsed) {
    return Promise.reject(new Error(`error looking up part content at ${link.href}`))
  }

  const { messageId, partId } = parsed
  if (!messageId || !partId) {
    return Promise.reject(new Error(`content URI must be a non-relative mid URI: ${link.href}`))
  }

  const msg = m.first(m.filter(m => m.id === messageId, context))
  if (!msg) {
    return Promise.reject(new Error(`could not find message in conversation context: ${messageId}`))
  }

  const stream = await fetchMessagePart(msg, partId, conn)
  return {
    asString:  toString(stream, 'utf8'),  // TODO: check charset
    mediaType: link.mediaType,
  }
}
