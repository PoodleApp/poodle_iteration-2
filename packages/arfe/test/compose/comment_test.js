/* @flow */

import * as AS  from 'activitystrea.ms'
import * as m   from 'mori'
import toString from 'stream-to-string'
import stream   from 'string-to-stream'
import describe from 'tape-async'
import * as MB  from '../builders/message'

import * as compose            from '../../src/compose'
import Conversation, * as Conv from '../../src/models/Conversation'

const a = MB.randomMessageId()
const b = MB.randomMessageId()

function messages() {
  return [
    {
      from: [MB.participants.Loraine],
      to: [MB.participants.Joseph],
      activity: {
        "@context": "http://www.w3.org/ns/activitystreams#",
        type: "Create",
        object: {
          type: "Note",
          url: {
            type: "Link",
            mediaType: "text/html",
            href: "cid:html",
          },
        },
      },
      html: 'first post',
      messageId: a,
      subject: 'Look at this thing',
    },
    {
      from: [MB.participants.Joseph],
      to: [MB.participants.Loraine],
      activity: {
        "@context": "http://www.w3.org/ns/activitystreams#",
        type: "Create",
        object: {
          type: "Note",
          url: {
            type: "Link",
            mediaType: "text/html",
            href: "cid:html",
          },
        },
      },
      html: 'a reply appears',
      messageId: b,
      inReplyTo: a,
    },
  ]
} 

async function testConversation(): Promise<[Conversation, MB.FetchPartContent]> {
  const [msgs, fetchPartContent] = MB.newThread(messages())
  const conversation = await Conv.messagesToConversation(fetchPartContent, msgs)
  return [conversation, fetchPartContent]
}

describe('compose/comment', ({ test }) => {

  test('produces a reply', async t => {
    t.plan(2)

    const [conversation, fetcher] = await testConversation()
    const replyContent = 'new reply'
    const loraine = MB.participants.Loraine
    const joseph  = MB.participants.Joseph


    const reply = compose.comment({
      ...compose.defaultRecipients({ from: loraine, conversation }),
      content: {
        mediaType: 'text/html',
        stream:    stream(replyContent),
      },
      conversation, 
    })

    const { envelope } = reply
    if (!envelope) {
      return
    }
    t.equal(envelope.from, loraine.headerValue, "reply is from Loraine")
    t.equal(envelope.to[1], joseph.headerValue, "reply is to Joseph")

    // const rfc822 = await toString(reply.createReadStream())
    // console.log(rfc822)

    // TODO: test content is included
    // TODO: test activity ID is correct
  })

})
