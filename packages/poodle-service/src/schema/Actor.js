/* @flow */

import * as AS       from 'activitystrea.ms'
import * as graphql  from 'graphql'
import LanguageValue from './LanguageValue'

export type ActorData = AS.models.Object

const URI = new graphql.GraphQLNonNull(graphql.GraphQLString)

export default new graphql.GraphQLObjectType({
  name: 'Actor',
  description: 'Person or entity who performs an activity, as described by Activitystrea.ms 2.0 spec',
  fields: {
    id: {
      type: URI,
      description: 'Unique identifier',
    },
    name: {
      type: LanguageValue,
      description: 'Display name of the actor',
    },
  }
})
