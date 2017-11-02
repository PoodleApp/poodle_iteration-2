/* @flow */

import * as AS from 'activitystrea.ms'
import * as Vocab from 'vocabs-as'
import Conversation from '../models/Conversation'
import DerivedActivity from '../models/DerivedActivity'
import Message from '../models/Message'
import * as asutil from '../util/activity'
import { type Builder } from './builders'
import * as builders from './builders'
import { type Content, type MessageParams } from './types'

type EditOptions = MessageParams & {
  attachments?: Content[],
  content: Content,
  activity: DerivedActivity,
  fallbackContent?: Content, // default value is value of `content`
  related?: Content[]
}

/*
 * Produce a message carrying an activity that describes changes to be applied
 * to some existing activity
 */
export default function edit (options: EditOptions): Builder<Message> {
  const originalActivity = options.activity.activity.activity
  const { content, fallbackContent } = options

  const addContent = fallbackContent
    ? builders
        .primaryContent(fallbackContent)
        .then(() => builders.relatedContent(options.content))
    : builders.primaryContent(content)

  return addContent
    .then(({ id: revisedContentId, uri: revisedContentUri }) => {
      return builders.relatedActivity(revisedActivityUri =>
        asutil.modify(act => {
          act.id(revisedActivityUri)
          act
            .object()
            .object(
              AS.note()
                .url(
                  AS.link()
                    .mediaType(options.content.mediaType)
                    .href(revisedContentUri)
                    .get()
                )
                .get()
            )
        }, originalActivity)
      )
    })
    .then(({ id: revisedActivityId, uri: revisedActivityUri }) => {
      return builders.primaryActivity(editActivityUri =>
        AS.activity([Vocab.Update])
          .id(editActivityUri)
          .object(
            AS.activity(options.activity.types)
              .url(
                AS.link()
                  .mediaType('application/activity+json')
                  .href(options.activity.id)
                  .get()
              )
              .get()
          )
          .result(
            AS.object(options.activity.types)
              .url(
                AS.link()
                  .mediaType('application/activity+json')
                  .href(revisedActivityUri)
                  .get()
              )
              .get()
          )
          .get()
      )
    })
    .then(() => builders.relatedParts(options.related))
    .then(() => builders.attachments(options.attachments))
    .then(() => builders.message(options))
}
