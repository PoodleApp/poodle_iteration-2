/* @flow */

import * as URI from 'arfe/lib/models/uri'

import type { Activity, ActivityViewProps } from './types'

export function editing(props: ActivityViewProps, activity: Activity): boolean {
  return !!props.editing && props.editing === activity.id
}

export function hasType(type: string, activity: Activity): boolean {
  return activity.types.some(t => t === type)
}

export function hasObjectType(type: string, activity: Activity): boolean {
  return !!activity.object && activity.object.types.some(t => t === type)
}

export function myContent(activity: Activity, email: string): boolean {
  const me   = URI.mailtoUri(email)
  const them = activity.actor
  return !!them && (URI.equals(them.id, me))
}
