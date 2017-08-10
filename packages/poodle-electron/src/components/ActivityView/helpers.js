/* @flow */

import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import * as URI from 'arfe/lib/models/uri'
import * as m from 'mori'

import type { ActivityViewProps } from './types'

export function editing (
  props: ActivityViewProps,
  activity: DerivedActivity
): boolean {
  return !!props.editing && props.editing === activity.id
}

export function hasType (type: string, activity: DerivedActivity): boolean {
  return activity.types.some(t => t === type)
}

export function myContent (activity: DerivedActivity, email: string): boolean {
  const me = URI.mailtoUri(email)
  const them = activity.actor
  return !!them && URI.equals(them.id, me)
}

export function pendingLike(activity: DerivedActivity, pendingLikes: URI.URI[]): boolean {
  return m.some(objectUri => pendingLikes.includes(objectUri), activity.objectUris)
}
