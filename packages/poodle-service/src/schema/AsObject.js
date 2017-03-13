/* @flow */

import * as AS      from 'activitystrea.ms'
import * as graphql from 'graphql'

const URI = new graphql.GraphQLNonNull(graphql.GraphQLString)

export default new graphql.GraphQLObjectType({
  name: 'AsObject',
  description: 'Object with properties defined by the Activitystrea.ms 2.0 spec',
  fields: {
    id: {
      type: graphql.GraphQLString,
      description: 'URI of object',
      resolve(obj) { return obj.id },
    },
    types: {
      type: new graphql.GraphQLList(URI),
      description: 'Type or types that  this object represents',
      resolve(obj) { return arrayFromIterable(obj.type) },
    },
  },
})

function arrayFromIterable<T>(iter: ?AS.ValueIterator<T>): T[] {
  return iter ? Array.from(iter) : []
}
