/* @flow strict */

import * as AS from 'activitystrea.ms'
import * as m from 'mori'
import Address from '../models/Address'
import Message from '../models/Message'
import Conversation from '../models/Conversation'
import * as LV from '../models/LanguageValue'
import { midUri } from '../models/uri'
import * as asutil from '../util/activity'
import { type Builder } from './builders'
import * as builders from './builders'
import * as compose from './helpers'
import * as Struct from './struct'
import { type Content, type MessageParams } from './types'

import type { Seqable } from 'mori'

// TODO: include markdown source with message

type CommentOptions = MessageParams & {
  content: Content,
  fallbackContent?: Content, // default value is value of `content`
  attachments?: Content[],
  related?: Content[]
}

/*
 * Reply to a conversation
 */
export default function comment ({
  content,
  fallbackContent,
  related,
  attachments,
  ...options
}: CommentOptions): Builder<Message> {
  const addContent = fallbackContent
    ? builders
        .primaryContent(fallbackContent)
        .then(() => builders.relatedContent(content))
    : builders.primaryContent(content)

  return addContent
    .then(({ uri: contentUri }) =>
      builders.primaryActivity(activityUri =>
        AS.create()
          .id(activityUri)
          .object(
            AS.note()
              .url(
                AS.link()
                  .mediaType(content.mediaType)
                  .href(contentUri)
                  .get()
              )
              .get()
          )
          .get()
      )
    )
    .then(() => builders.relatedParts(related))
    .then(() => builders.attachments(attachments))
    .then(() => builders.message(options))
}
