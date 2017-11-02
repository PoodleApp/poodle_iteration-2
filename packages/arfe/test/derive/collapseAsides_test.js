/* @flow */

import test from 'ava'
import * as m from 'mori'
import * as MB from '../builders/message'

import derive from '../../src/derive'
import Activity, { getActivities } from '../../src/models/Activity'
import { syntheticTypes } from '../../src/models/DerivedActivity'
import { midUri } from '../../src/models/uri'

import type { Seqable } from 'mori'

const ppl = MB.participants

const a = MB.randomMessageId()
const b = MB.randomMessageId()
const c = MB.randomMessageId()
const d = MB.randomMessageId()

const messages = [
  {
    from: [ppl.Merrilee],
    to: [ppl.Reiko],
    cc: [ppl.Melba, ppl.Loraine],
    messageId: a
  },
  {
    from: [ppl.Reiko],
    to: [ppl.Merrilee],
    messageId: b,
    inReplyTo: a
  },
  {
    from: [ppl.Reiko],
    to: [ppl.Merrilee],
    cc: [ppl.Melba, ppl.Loraine],
    messageId: c,
    inReplyTo: a
  },
  {
    from: [ppl.Merrilee],
    to: [ppl.Reiko],
    messageId: d,
    inReplyTo: b
  }
]

async function testThread (): Promise<[Seqable<Activity>, MB.FetchPartContent]> {
  const [msgs, fetchPartContent] = MB.newThread(messages)
  const activitiesByMessage = await Promise.all(
    m.intoArray(m.map(getActivities.bind(null, fetchPartContent), msgs))
  )
  return [m.flatten(activitiesByMessage), fetchPartContent]
}

test('creates one aside', async t => {
  t.plan(3)
  const [thread, fetcher] = await testThread()
  const activities = await derive(fetcher, thread)
  const asides = m.filter(
    act => act.hasType(syntheticTypes.Aside),
    activities
  )
  t.is(m.count(asides), 1, 'expected to find one aside')

  const act = m.first(asides)
  t.true(act.isSynthetic, 'aside is a synthetic activity')
  t.true(
    act.hasType(syntheticTypes.Aside),
    'aside has the appropriate activity type'
  )
})

test('aside contains two messages', async t => {
  t.plan(4)
  const [thread, fetcher] = await testThread()
  const activities = await derive(fetcher, thread)
  const asides = m.filter(
    act => act.hasType(syntheticTypes.Aside),
    activities
  )
  const act = m.first(asides)
  const aside = act.aside

  t.truthy(aside, 'aside has nested activities')
  if (!aside) {
    throw new Error('no aside')
  }

  t.is(m.count(aside), 2, 'aside contains two activities')
  t.true(m.some(a => a.id === midUri(b), aside), 'aside contains message `b`')
  t.true(m.some(a => a.id === midUri(d), aside), 'aside contains message `d`')
})
