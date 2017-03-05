/* @flow */

import * as AS      from 'activitystrea.ms'
import * as graphql from 'graphql'

export const args = {
  lang: {
    type: graphql.GraphQLString,
    description: 'Language value to request (e.g., `en-US`)',
  },
}

export function resolver(lv: AS.models.LanguageValue, args: { lang: string }): string {
  return lv.get(args.lang) || lv.get()
}

// TODO: deprecated; use the above helpers instead
export default new graphql.GraphQLObjectType({
  name: 'LanguageValue',
  description: 'Variations of a string translated into different languages',
  fields: {
    get: {
      type: graphql.GraphQLString,
      description: 'Get a translation for the given language, if one exists',
      args,
      resolve(lv, args) {
        return lv.get(args.lang) || lv.get()
      },
    },
    has: {
      type: graphql.GraphQLBoolean,
      description: 'Test whether the language value has a translation for the given language tag',
      args,
      resolve(lv, args) {
        return args.lang && lv.has(args.lang)
      },
    },
  }
})
