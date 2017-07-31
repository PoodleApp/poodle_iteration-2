/* @flow */

import * as AS from 'activitystrea.ms'
import React from 'react'

type Props = {
  value: ?AS.models.LanguageValue,
  defaultValue?: string
}

export function Lang ({ value, defaultValue }: Props) {
  return languageValue(value, defaultValue)
}

export function languageValue (
  value: ?AS.models.LanguageValue,
  defaultValue: string = '[no content]'
): string {
  if (!value) {
    return defaultValue
  }
  const langs = navigator.languages
  for (const lang of langs) {
    const str = value.get(lang)
    if (str) {
      return str
    }
  }
  return value.get()
}
