/* @flow */

import * as AS from 'activitystrea.ms'
import BuildMail from 'buildmail'
import * as m from 'mori'
import Address from '../models/Address'
import Conversation from '../models/Conversation'
import { type URI } from '../models/uri'
import * as compose from './helpers'

import type { ValueIterator } from 'activitystrea.ms'
import type { Seqable } from 'mori'
import type { Content } from './helpers'
import type { MessageConfiguration } from './types'

type LikeOptions = {
  from: Seqable<Address>,
  to: Seqable<Address>,
  cc: Seqable<Address>,
  likedObjectUris: Seqable<URI>,
  conversation: Conversation,
  fallbackContent: Content
}

export default function like (
  options: LikeOptions
): MessageConfiguration {
  const activity = ({ activityUri, contentUri }) =>
    AS.like()
      .id(activityUri)
      .object(m.intoArray(options.likedObjectUris))
      .get()

  const root = compose.buildAlternative({
    activity,
    root: compose.newMessage.bind(null, options),
    content: options.fallbackContent
  })

  return {
    envelope: root.getEnvelope(),
    raw: root.createReadStream()
  }
}

function arrayFromIterable<T>(iter: ?ValueIterator<T>): T[] {
  return iter ? Array.from(iter) : []
}
