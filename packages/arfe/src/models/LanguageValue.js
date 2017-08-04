/* @flow */

import * as AS from 'activitystrea.ms'

export function getString (
  value: ?AS.models.LanguageValue,
  defaultValue: string = '[no content]'
): string {
  if (!value) {
    return defaultValue
  }
  // TODO: assumes presence of `navigator` object
  const langs = navigator.languages
  for (const lang of langs) {
    const str = value.get(lang)
    if (str) {
      return str
    }
  }
  return value.get()
}
