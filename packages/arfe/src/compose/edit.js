/* @flow */

import * as AS from 'activitystrea.ms'
import BuildMail from 'buildmail'
import * as m from 'mori'
import * as Vocab from 'vocabs-as'
import Address from '../models/Address'
import Conversation from '../models/Conversation'
import DerivedActivity from '../models/DerivedActivity'
import * as LV from '../models/LanguageValue'
import { midUri } from '../models/uri'
import * as asutil from '../util/activity'
import * as compose from './helpers'

import type { Seqable } from 'mori'
import type { Content } from './helpers'
import type { MessageConfiguration } from './types'

// TODO: customizable fallback presentation of edited content, along the lines
// of "Edit to my previous message: [revised content]"

type EditOptions = {
  from: Seqable<Address>,
  to: Seqable<Address>,
  cc: Seqable<Address>,
  content: Content,
  conversation: Conversation,
  activity: DerivedActivity,
  fallbackContent?: Content // default value is value of `content`
}

/*
 * Produce a message carrying an activity that describes changes to be applied
 * to some existing activity
 */
export default function edit (options: EditOptions): MessageConfiguration {
  const sender = m.first(options.from)
  const messageId = compose.getUniqueId(sender)
  const editActivityId = compose.getUniqueId(sender)
  const revisedActivityId = compose.getUniqueId(sender)
  const revisedContentId = compose.getUniqueId(sender)

  // TODO: ...
  const originalActivity = options.activity.activity.activity
  const revisedActivity = asutil.modify(act => {
    act.id(midUri(messageId, revisedActivityId))
    act
      .object()
      .object(
        AS.note()
          .url(
            AS.link()
              .mediaType(options.content.mediaType)
              .href(midUri(messageId, revisedContentId))
              .get()
          )
          .get()
      )
  }, originalActivity)

  const editActivity = AS.activity([Vocab.Update])
    .id(midUri(messageId, editActivityId))
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
            .href(midUri(messageId, revisedActivityId))
            .get()
        )
        .get()
    )
    .get()

  const root = build(options, {
    activity: {
      id: editActivityId,
      mediaType: 'application/activity+json',
      stream: asutil.createReadStream(editActivity)
    },
    fallbackContent: {
      id: revisedContentId,
      mediaType: options.content.mediaType,
      stream: options.content.stream
    },
    messageId,
    relatedContent: [
      {
        id: revisedActivityId,
        mediaType: 'application/activity+json',
        stream: asutil.createReadStream(revisedActivity)
      }
    ]
  })

  return {
    envelope: root.getEnvelope(),
    raw: root.createReadStream()
  }
}

function build (
  options: EditOptions,
  {
    activity,
    fallbackContent,
    messageId,
    relatedContent = [],
    attachments = []
  }: {
    activity: Content,
    fallbackContent: Content,
    messageId: string,
    relatedContent?: Content[],
    attachments?: Content[]
  }
): BuildMail {
  const root = compose.newNode('multipart/alternative')

  // Set basic message headers
  compose.newMessage(options, root)
  root.addHeader({
    'Message-ID': `<${messageId}>`
  })

  const activityPart = compose.contentNode(activity)
  const contentPart = compose.contentNode(fallbackContent)
  const relatedParts = relatedContent.map(compose.contentNode)
  const attachmentParts = attachments.map(compose.contentNode)

  root.appendChild(contentPart)
  root.appendChild(bundleParts('related', activityPart, relatedParts))

  return bundleParts('mixed', root, attachmentParts)
}

function bundleParts (
  multipartType: 'related' | 'mixed',
  primaryPart: BuildMail,
  additionalParts: BuildMail[]
): BuildMail {
  if (additionalParts.length > 0) {
    const root = compose.newNode(`multipart/${multipartType}`)
    root.appendChild(primaryPart)
    for (const part of additionalParts) {
      root.appendChild(part)
    }
    return root
  } else {
    return primaryPart
  }
}
