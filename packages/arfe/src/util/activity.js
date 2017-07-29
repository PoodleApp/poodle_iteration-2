/* @flow */

import * as AS           from 'activitystrea.ms'
import ctx               from 'activitystreams-context'
import * as promise      from './promise'
import streamFromPromise from 'stream-from-promise'

import type { Readable } from 'stream'
import type { URI }      from '../models/uri'

type Activity = AS.models.Activity
type ActivityBuilder = AS.models.Activity.Builder

export function createReadStream(act: AS.models.Object): Readable {
  return streamFromPromise(
    exportActivity(act)
    .then(obj => new Buffer(JSON.stringify(obj)))
    .catch(err => {
      console.error('error exporting activity as readable stream', err)
      return Promise.reject(err)
    })
  )
}

/*
 * Resolve JSON-LD metadata, return an object that represents an
 * activitystrea.ms object - possibly an activity.
 *
 * Re-implements some code from `AS.Stream` to get an activity-parsing function
 * that does not have to be run in a stream.
 */
export function importObject(obj: Object): Promise<AS.models.Object> {
  const res = obj['@context'] ? obj : { ...obj, '@context': ctx }
  return promise.lift1(cb => AS.import(obj, cb))
}

export function exportActivity(act: AS.models.Object): Promise<Object> {
  return promise.lift1(cb => act.export(cb))
}

export function getUrl(obj: AS.models.Object): ?URI {
  const link = Array.from(obj.url)
  return link[0] && link[0].href
}

export function modify(fn: (_: ActivityBuilder) => void, activity: Activity): Activity {
  const builder = activity.template()()
  fn(builder)
  return builder.get()
}

export function newString(str: string): AS.models.LanguageValue {
  const builder = new AS.models.LanguageValue.Builder()
  builder.set(str)
  return builder.get()
}
