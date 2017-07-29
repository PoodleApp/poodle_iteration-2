/* @flow */

import * as m     from 'mori'
import describe   from 'tape'
import * as Vocab from 'vocabs-as'
import * as MB    from '../builders/message'

import derive                      from '../../src/derive'
import Activity, { getActivities } from '../../src/models/Activity'
import { syntheticTypes }          from '../../src/models/DerivedActivity'
import * as asutil                 from '../../src/util/activity'

import type { Seqable } from 'mori'

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
          type: "Document",
          url: {
            type: "Link",
            mediaType: "text/html",
            href: "cid:html",
          },
        },
      },
      html: 'original content',
      messageId: a,
    },
    {
      from: [MB.participants.Joseph],
      to: [MB.participants.Loraine],
      activity: {
        "@context": "http://www.w3.org/ns/activitystreams#",
        type: "Update",
        // TODO: update activitystrea.ms to permit bare URI as `object` value
        // object: `mid:${a}/activity`,
        object: {
          type: "Link",
          mediaType: "application/activity+json",
          href: `mid:${a}/activity`,
        },
        result: {
          type: "Link",
          mediaType: "application/activity+json",
          href: `cid:revision`,
        },
      },
      // Revision goes in its own part so that it is addressable by URI
      revision: {
        type: "Create",
        object: {
          type: "Document",
          url: {
            type: "Link",
            mediaType: "text/html",
            href: "cid:html",
          },
        },
      },
      html: 'updated content',
      messageId: b,
      inReplyTo: a,
    },
  ]
} 

async function testThread(): Promise<[Seqable<Activity>, MB.FetchPartContent]> {
  const [msgs, fetchPartContent] = MB.newThread(messages())
  const activitiesByMessage = await Promise.all(
    m.intoArray(m.map(getActivities.bind(null, fetchPartContent), msgs))
  )
  return [m.flatten(activitiesByMessage), fetchPartContent]
}

describe('collapseEdits', ({ test }) => {

  test('removes `Update` activities from list', async t => {
    t.plan(2)
    const [thread, fetcher] = await testThread()
    const activities        = await derive(fetcher, thread)
    t.equal(m.count(activities), 1, 'activity list has shrunk to one item')

    const activity = m.first(activities)
    t.ok(activity.hasType(Vocab.Create), 'remaining activity has type of the original activity')
  })

  test('updates content links in updated objects', async t => {
    t.plan(2)
    const [thread, fetcher] = await testThread()
    const activities        = await derive(fetcher, thread)
    const activity          = m.first(activities)
    const links             = activity.objectLinks
    t.equal(m.count(links), 1, 'activity has a link to content')

    const link = m.first(links)
    t.equal(link.href, `mid:${b}/html`, 'content link points to revised content')
  })

  test('preserves actor and type information from original activity', async t => {
    t.plan(3)
    const [thread, fetcher] = await testThread()
    const activities        = await derive(fetcher, thread)
    const activity          = m.first(activities)

    const actor = activity.actor
    t.ok(!!actor, 'activity has an actor')
    if (!actor) { throw new Error('no actor') }

    t.equal(actor.id, MB.participants.Loraine.uri, 'original actor is preserved')
    t.ok(activity.hasType(Vocab.Create), 'original activity type is preserved')
  })

})
