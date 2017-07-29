/* @flow */

import * as AS      from 'activitystrea.ms'
import BuildMail    from 'buildmail'
import Address      from '../models/Address'
import Conversation from '../models/Conversation'
import * as compose from './helpers'

import type { Seqable } from 'mori'
import type { Content } from './helpers'

type CommentOptions = {
  from:             Seqable<Address>,
  to:               Seqable<Address>,
  cc:               Seqable<Address>,
  content:          Content,
  conversation:     Conversation,
  fallbackContent?: Content,  // default value is value of `content`
}

export default function comment(options: CommentOptions): BuildMail {

  const activity = ({ activityUri, contentUri }) => (
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
  )

  const root = compose.newMessage.bind(null, options)

  return compose.buildAlternative({
    activity,
    root,
    content:         options.content,
    fallbackContent: options.fallbackContent,
  })
}
