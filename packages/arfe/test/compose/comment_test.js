/* @flow strict */

import * as AS from 'activitystrea.ms'
import test from 'ava'
import * as m from 'mori'
import toString from 'stream-to-string'
import stream from 'string-to-stream'
import * as MB from '../builders/message'

import * as compose from '../../src/compose'
import Conversation, * as Conv from '../../src/models/Conversation'

const a = MB.randomMessageId()
const b = MB.randomMessageId()

function messages () {
  return [
    {
      from: [MB.participants.Loraine],
      to: [MB.participants.Joseph],
      activity: {
        '@context': 'http://www.w3.org/ns/activitystreams#',
        type: 'Create',
        object: {
          type: 'Note',
          url: {
            type: 'Link',
            mediaType: 'text/html',
            href: 'cid:html'
          }
        }
      },
      html: 'first post',
      messageId: a,
      subject: 'Look at this thing'
    },
    {
      from: [MB.participants.Joseph],
      to: [MB.participants.Loraine],
      activity: {
        '@context': 'http://www.w3.org/ns/activitystreams#',
        type: 'Create',
        object: {
          type: 'Note',
          url: {
            type: 'Link',
            mediaType: 'text/html',
            href: 'cid:html'
          }
        }
      },
      html: 'a reply appears',
      messageId: b,
      inReplyTo: a
    }
  ]
}

async function testConversation (): Promise<
  [Conversation, MB.FetchPartContent]
> {
  const [msgs, fetchPartContent] = MB.newThread(messages())
  const conversation = await Conv.messagesToConversation(fetchPartContent, msgs)
  return [conversation, fetchPartContent]
}

test('produces a reply', async t => {
  t.plan(2)

  const [conversation, fetcher] = await testConversation()
  const replyContent = 'new reply'
  const loraine = MB.participants.Loraine
  const joseph = MB.participants.Joseph

  const replyBuilder = compose.comment({
    ...conversation.replyRecipients({
      email: loraine.email,
      name: loraine.displayName
    }),
    content: {
      mediaType: 'text/html',
      stream: stream(replyContent)
    },
    conversation
  })
  const { message, contentMap } = await compose.build(replyBuilder, loraine)
  const reply = await compose.serializeFromContentMap({ message, contentMap })

  const { envelope } = reply
  if (!envelope) {
    return
  }
  t.is(envelope.from, loraine.email, 'reply is from Loraine')
  t.is(envelope.to[0], joseph.email, 'reply is to Joseph')

  // const rfc822 = await toString(reply.createReadStream())
  // console.log(rfc822)

  // TODO: test content is included
  // TODO: test activity ID is correct
})
