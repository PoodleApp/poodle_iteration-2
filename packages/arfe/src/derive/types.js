/* @flow */

import DerivedActivity from '../models/DerivedActivity'

import type { Seqable }  from 'mori'
import type { Readable } from 'stream'
import type { URI }      from '../models/uri'

/*
 * A transformer process a list of activities in some way. For example, one
 * transformer removes `Like` activities, and simultaneously sets like counts on
 * other activities.
 *
 * A transformer is a pure-ish function. It does not modify its input; but it
 * may make calls to fetch MIME parts from messages in the same thread.
 */
export type Transformer = (
  f: Fetcher,
  activities: Seqable<DerivedActivity>
) => Promise<Seqable<DerivedActivity>>

/*
 * Currently the fetcher will only fetch MIME parts in the same conversation
 * thread.
 */
export type Fetcher = (uri: URI) => Promise<Readable>
