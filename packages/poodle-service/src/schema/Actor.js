/* @flow */

import * as AS      from 'activitystrea.ms'
import * as graphql from 'graphql'
import * as lang    from './LanguageValue'

import type { ValueIterator } from 'activitystrea.ms'

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
      type: graphql.GraphQLString,
      description: 'Display name of the actor',
      args: lang.args,
      resolve(actor, args) {
        const name = actor.name
        return name
          ? lang.resolver(name, args)
          : emailFromId(actor.id)
      },
    },
  }
})

function emailFromId(id: string): string {
  return id.replace(/^[a-z]+:/, '')
}
