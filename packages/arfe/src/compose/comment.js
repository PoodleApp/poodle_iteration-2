/* @flow */

import * as AS from 'activitystrea.ms'
import BuildMail from 'buildmail'
import * as m from 'mori'
import Address from '../models/Address'
import Conversation from '../models/Conversation'
import * as compose from './helpers'

import type { Seqable } from 'mori'
import type { Content } from './helpers'
import type { MessageConfiguration } from './types'

// TODO: include markdown source with message

type CommentOptions = {
  from: Seqable<Address>,
  to: Seqable<Address>,
  cc: Seqable<Address>,
  content: Content,
  conversation: Conversation,
  fallbackContent?: Content // default value is value of `content`
}

export default function comment (
  options: CommentOptions
): MessageConfiguration {
  const activity = ({ activityUri, contentUri }) =>
    AS.create()
      .id(activityUri)
      .object(
        AS.note()
          .url(
            AS.link()
              .mediaType(options.content.mediaType)
              .href(contentUri)
              .get()
          )
          .get()
      )
      .get()

  const root = compose.buildAlternative({
    activity,
    root: compose.newMessage.bind(null, options),
    content: options.content,
    fallbackContent: options.fallbackContent
  })

  return {
    envelope: root.getEnvelope(),
    raw: root.createReadStream()
  }
}
