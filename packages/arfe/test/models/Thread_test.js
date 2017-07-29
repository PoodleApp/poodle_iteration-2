/* @flow */

import * as m   from 'mori'
import describe from 'tape'
import * as MB  from '../builders/message'

import { getActivities } from '../../src/models/Activity'
import { buildThread }   from '../../src/models/Thread'

import type { Thread } from '../../src/models/Thread'

const ppl = MB.participants

const a = MB.randomMessageId()
const b = MB.randomMessageId()
const c = MB.randomMessageId()
const d = MB.randomMessageId()

const messages = [
  {
    from:      [ppl.Merrilee],
    to:        [ppl.Reiko],
    cc:        [ppl.Melba, ppl.Loraine],
    messageId: a,
  },
  {
    from:      [ppl.Reiko],
    to:        [ppl.Merrilee],
    messageId: b,
    inReplyTo: a,
  },
  {
    from:      [ppl.Reiko],
    to:        [ppl.Merrilee],
    cc:        [ppl.Melba, ppl.Loraine],
    messageId: c,
    inReplyTo: a,
  },
  {
    from:      [ppl.Merrilee],
    to:        [ppl.Reiko],
    messageId: d,
    inReplyTo: b,
  },
]

async function testThread(): Promise<Thread> {
  const [msgs, fetchPartContent] = MB.newThread(messages)
  const activitiesByMessage = await Promise.all(
    m.intoArray(m.map(getActivities.bind(null, fetchPartContent), msgs))
  )
  const activities = m.flatten(activitiesByMessage)
  return buildThread(activities)
}

describe('Thread', ({ test }) => {

  test('assembles a thread', async t => {
    t.plan(2)

    const thread = await testThread()
    t.equal(m.count(thread), 1, 'thread has one top-level message')

    const [_, replies] = m.first(thread)
    if (!replies) { throw new Error('Expected a reply') }

    t.equal(m.count(replies), 2, 'there are two messages that reply directly to the top-level message')
  })

})
