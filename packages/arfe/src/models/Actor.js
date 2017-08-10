/* @flow */

import * as AS from 'activitystrea.ms'
import Address from './Address'
import * as LV from './LanguageValue'

export type Actor = AS.models.Object

export function address (actor: Actor): Address {
  const [mailbox, host] = email(actor).split('@', 2)
  return actor.name
    ? new Address({
      name: LV.getString(actor.name),
      mailbox,
      host
    })
    : new Address({ mailbox, host })
}

export function displayName (actor: ?Actor): string {
  if (!actor) {
    return '[unknown]'
  }
  return LV.getString(actor.name, email(actor))
}

export function email (actor: Actor): string {
  return actor.id.replace(/^[a-z]+:/, '')
}
