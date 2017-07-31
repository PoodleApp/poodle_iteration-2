/* @flow */

import * as AS from 'activitystrea.ms'
import React from 'react'
import { languageValue } from './Lang'

type Actor = AS.models.Object

export function displayName (actor: ?Actor): string {
  if (!actor) {
    return '[unknown]'
  }
  return languageValue(actor.name, email(actor))
}

export function email (actor: Actor): string {
  return actor.id.replace(/^[a-z]:/, '')
}
