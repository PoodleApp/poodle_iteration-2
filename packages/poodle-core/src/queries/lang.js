/* @flow */

import * as AS from 'activitystrea.ms'

export function resolveLanguageValue (
  langs: string[],
  lv: AS.models.LanguageValue
): string {
  for (const lang of langs) {
    const v = lv.get(lang)
    if (v) {
      return v
    }
  }
  return lv.get()
}
