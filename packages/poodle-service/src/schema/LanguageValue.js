/* @flow */

import * as graphql from 'graphql'

const langArgs = {
  lang: {
    type: graphql.GraphQLString,
    description: 'Language value to request (e.g., `en-US`)',
  },
}

export default new graphql.GraphQLObjectType({
  name: 'LanguageValue',
  description: 'Variations of a string translated into different languages',
  fields: {
    get: {
      type: graphql.GraphQLString,
      description: 'Get a translation for the given language, if one exists',
      args: langArgs,
      resolve(lv, args) {
        return lv.get(args.lang)
      },
    },
    has: {
      type: graphql.GraphQLBoolean,
      description: 'Test whether the language value has a translation for the given language tag',
      args: langArgs,
      resolve(lv, args) {
        return args.lang && lv.has(args.lang)
      },
    },
  }
})
