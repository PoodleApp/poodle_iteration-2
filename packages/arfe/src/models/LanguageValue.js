/* @flow */

import * as AS from 'activitystrea.ms'

export function getString (
  value: ?AS.models.LanguageValue,
  defaultValue: string = '[no content]'
): string {
  if (!value) {
    return defaultValue
  }
  for (const lang of preferredLanguages()) {
    const str = value.get(lang)
    if (str) {
      return str
    }
  }
  return value.get()
}

// TODO: assumes presence of `navigator` object
function preferredLanguages(): string[] {
  if (typeof navigator !== 'undefined') {
    if (navigator.languages && navigator.languages.length > 0) {
      return navigator.languages
    }
    else if (navigator.language) {
      return [navigator.language]
    }
  }
  return []
}
