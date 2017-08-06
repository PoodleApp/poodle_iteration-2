/* @flow */

import * as AS  from 'activitystrea.ms'
import * as m   from 'mori'
import describe from 'tape'
import * as MB  from '../builders/message'

import Activity, { getActivities } from '../../src/models/Activity'
import Address                     from '../../src/models/Address'
import Message,  { parseMidUri }   from '../../src/models/Message'
import * as asutil                 from '../../src/util/activity'

describe('Activity', ({ test }) => {

  test('produces an activity from a message with HTML content', async t => {
    t.plan(6)

    const [msg, fetchPartContent] = MB.newMessage({
      html:      'message content',
      messageId: 'CAGM-pNuNmZ9tS1-4CA9s0Sb=dGSdi3w51NghoubSkqt5bUP6iA@mail.gmail.com',
    })
    const expectedContent = "message content"

    const acts = await getActivities(fetchPartContent, msg)
    t.equal(m.count(acts), 1, 'there should be one activity')

    const act = m.first(acts)
    t.equal(
      act.id,
      msg.uri
    )
    t.ok(m.count(act.objectLinks) > 0, 'activity should have links to content')

    const uri    = m.first(act.objectLinks).href
    const parsed = parseMidUri(uri)
    t.ok(parsed, 'content URI is a `mid:` URI')
    if (!parsed) { throw new Error('Expected object to link to a `mid:` resource') }

    t.equal(parsed.scheme, 'mid:', 'content URI is fully qualified')
    t.equal(parsed.messageId, msg.id, 'content link points to a part in the same message')
  })

  test('normalizes `actor`', async t => {
    t.plan(1)
    const [msg, fetchPartContent] = MB.newMessage({
      from: [new Address({ name: 'Jesse', mailbox: 'jesse', host: 'sitr.us' })],
    })
    const acts = await getActivities(fetchPartContent, msg)
    const act  = m.first(acts)
    t.equal(act.activity.actor.first.id, 'mailto:jesse@sitr.us')
  })

  test('normalizes activity by adding `id`', async t => {
    t.plan(2)
    const messageId = MB.randomMessageId()
    const contentId = 'activity'
    const activity  = await asutil.exportActivity(
      AS.create().get()
    )
    const [msg, fetchPartContent] = MB.newMessage({ activity, messageId })

    const acts = await getActivities(fetchPartContent, msg)
    t.equal(m.count(acts), 1, 'message contains one activity')

    const act = m.first(acts)
    t.equal(act.id, `mid:${encodeURIComponent(messageId)}/${encodeURIComponent(contentId)}`)
  })

  test('expands relative `cid:` URIs in activities', async t => {
    t.plan(3)
    const messageId = MB.randomMessageId()
    const partId    = 'html'
    const activity  = await asutil.exportActivity(
      AS.create().object(
        AS.note().url([
          AS.link().mediaType('text/html').href(`cid:${partId}`).get()
        ]).get()
      ).get()
    )
    const [msg, fetchPartContent] = MB.newMessage({
      activity,
      html: 'note content',
      messageId,
    })

    const acts = await getActivities(fetchPartContent, msg)
    t.equal(m.count(acts), 1, 'message contains one activity')

    const act = m.first(acts)
    const links = m.filter(l => l.mediaType === 'text/html', act.objectLinks)
    t.equal(m.count(links), 1, 'activity contains a link to html content')

    const link = m.first(links)
    t.equal(link.href, `mid:${encodeURIComponent(messageId)}/${encodeURIComponent(partId)}`, 'href is fully-qualified after normalization')
  })

})
