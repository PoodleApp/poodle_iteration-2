/* @flow */

import * as AS from 'activitystrea.ms'
import Message from '../models/Message'
import { type Builder } from './builders'
import * as builders from './builders'
import { type Content, type MessageParams } from './types'

type ConversationOptions = MessageParams & {
  content: Content,
  fallbackContent?: Content,
  attachments?: Content[],
  related?: Content[]
}

export default function conversation ({
  content,
  fallbackContent,
  related,
  attachments,
  ...options
}: ConversationOptions): Builder<Message> {
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
