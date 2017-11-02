/* @flow */

import * as AS from 'activitystrea.ms'
import * as m from 'mori'
import Conversation from '../models/Conversation'
import Message from '../models/Message'
import { type URI } from '../models/uri'
import { type Builder } from './builders'
import * as builders from './builders'
import { type Content, type MessageParams } from './types'

type LikeOptions = MessageParams & {
  likedObjectUris: m.Seqable<URI>,
  fallbackContent: Content
}

export default function like ({
  fallbackContent,
  likedObjectUris,
  ...options
}: LikeOptions): Builder<Message> {
  return builders
    .primaryContent(fallbackContent)
    .then(() =>
      builders.primaryActivity(activityUri =>
        AS.like()
          .id(activityUri)
          .object(m.intoArray(likedObjectUris))
          .get()
      )
    )
    .then(() => builders.message(options))
}
