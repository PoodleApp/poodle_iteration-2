/* @flow */

import * as AS from 'activitystrea.ms'
import { resolveLanguageValue } from './lang'

export type Actor = {
  displayName: string,
  email: string
}

export function processActor (langs: string[], actor: AS.models.Object): Actor {
  const email = emailFromId(actor.id)
  const displayName = actor.name
    ? resolveLanguageValue(langs, actor.name)
    : email
  return { displayName, email }
}

function emailFromId (id: string): string {
  return id.replace(/^[a-z]+:/, '')
}
