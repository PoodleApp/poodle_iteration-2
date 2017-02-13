/* @flow */

import * as graphql from 'graphql'

const URI = new graphql.GraphQLNonNull(graphql.GraphQLString)

export default new graphql.GraphQLObjectType({
  name: 'Address',
  description: 'Email address and name',
  fields: {
    displayName: {
      type: graphql.GraphQLString,
      description: 'Name, or email address if no name is available',
    },
    email: {
      type: graphql.GraphQLString,
      description: 'Email address',
    },
    host: {
      type: graphql.GraphQLString,
      description: 'Host portion of email address',
    },
    name: {
      type: graphql.GraphQLString,
      description: "E.g., person's full name",
    },
    uri: {
      type: URI,
      description: '`mailto:` URI constructed from email address',
    },
  },
})


