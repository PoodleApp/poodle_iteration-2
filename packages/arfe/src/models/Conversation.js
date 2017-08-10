/* @flow */

import * as AS from 'activitystrea.ms'
import * as m from 'mori'
import derive from '../derive'
import { newString } from '../util/activity'
import { catMaybes } from '../util/maybe'
import { uniqBy } from '../util/mori'
import Activity, * as Act from './Activity'
import * as Actor from './Actor'
import Address, * as Addr from './Address'
import DerivedActivity, * as Drv from './DerivedActivity'
import Message from './Message'
import * as Thrd from './Thread'

import type { List, Map, Seq, Seqable, Set, Vector } from 'mori'

import type Moment from 'moment'
import type { Readable } from 'stream'
import type { Thread } from './Thread'
import type { URI } from './uri'

export type Participants = {
  to: Seq<Address>,
  from: Seq<Address>,
  cc: Seq<Address>
}

type ConstructorOpts = {
  id: URI,
  activities?: Seqable<DerivedActivity>,
  allActivities?: Seqable<Activity>,
  subject?: AS.models.LanguageValue
}

export default class Conversation {
  id: URI // id is usually id of first activity
  activities: Seqable<DerivedActivity> // activities after resolving updates & like counts
  allActivities: Seqable<Activity> // activities including individual updates & likes
  subject: ?AS.models.LanguageValue

  constructor (opts: ConstructorOpts) {
    if (!opts.id) {
      throw new Error('conversation must be initialized with an `id` value')
    }
    this.id = opts.id
    this.activities = opts.activities || m.list()
    this.allActivities = opts.allActivities || m.list()
    this.subject = opts.subject
  }

  set (opts: $Shape<ConstructorOpts>): Conversation {
    return new Conversation({
      id: opts.id || this.id,
      activities: opts.activities || this.activities,
      allActivities: opts.allActivities || this.allActivities,
      subject: opts.subject || this.subject
    })
  }

  get allNames (): Seq<string> {
    return m.map(a => a.displayName, this.flatParticipants)
  }

  get flatAsides (): Conversation {
    return flatAsides(this)
  }

  get flatParticipants (): Seq<Address> {
    return Act.flatParticipants(this.allActivities)
  }

  get latestActivity (): DerivedActivity {
    return m.last(m.sortBy(a => a.publishTime, this.activities))
  }

  get lastActiveTime (): Moment {
    const times = catMaybes(m.map(a => a.publishTime, this.activities))
    const sorted = m.sortBy(m => m.toDate(), times)
    return m.last(sorted)
  }

  get messages (): Seq<Message> {
    const msgs = m.map(act => act.message, this.allActivities)
    return uniqBy(m => m.id, catMaybes(msgs))
  }

  get participants (): Participants {
    return Act.participants(this.allActivities)
  }

  reduce<R> (f: (r: R, a: DerivedActivity) => R, init: R): R {
    return reduceConversation(f, init, this)
  }

  // It is critical that the first ID in the list corresponds to the first
  // message in the thread
  // TODO: include IDs from references lists in messages that match up with
  // messages that we do not have copies of
  get references (): Seqable<string> {
    const thread = Thrd.buildThread(this.allActivities)
    return Thrd.getReferences(thread)
  }

  replyRecipients (actor: { email: string, name?: string }): Participants {
    const { to, from, cc } = this.participants
    const replyFrom = m.seq([Addr.build(actor)])
    const replyTo = uniqBy(a => a.email, m.concat(to, from))
    return {
      to: m.filter(a => !m.some(b => Addr.equals(a, b), replyFrom), replyTo),
      from: replyFrom,
      cc: m.filter(
        a => !m.some(b => Addr.equals(a, b), m.concat(replyFrom, replyTo)),
        cc
      )
    }
  }
}

export function asideToConversation (activity: DerivedActivity): Conversation {
  if (!activity.hasType(Drv.syntheticTypes.Aside)) {
    throw 'Cannot convert non-aside activity to conversation'
  }
  return new Conversation({
    id: activity.id,
    activities: activity.aside || m.list(),
    subject: newString('private aside')
  })
}

export async function threadToConversation (
  fetchPartContent: (msg: Message, partId: string) => Promise<Readable>,
  activities: Seqable<Activity>
): Promise<Conversation> {
  const firstActivity = m.first(activities)
  const derived = await derive(fetchPartContent, activities)
  const conv = new Conversation({
    id: firstActivity.id,
    activities: derived,
    allActivities: activities,
    subject: firstActivity.title
  })
  return flatAsides(conv)
}

export async function messagesToConversation (
  fetchPartContent: (msg: Message, partId: string) => Promise<Readable>,
  messages: Seqable<Message>
): Promise<Conversation> {
  const activitiesByMessage = await Promise.all(
    m.intoArray(
      m.map(tryToGetActivities.bind(null, fetchPartContent), messages)
    )
  )
  const activities = m.flatten(activitiesByMessage)
  return threadToConversation(fetchPartContent, activities)
}

async function tryToGetActivities (
  fetchPartContent: (msg: Message, partId: string) => Promise<Readable>,
  message: Message
): Promise<Seqable<Activity>> {
  try {
    // The `await` is necessary to catch errors
    return await Act.getActivities(fetchPartContent, message)
  } catch (err) {
    return [
      Drv.newSyntheticActivity(
        AS.activity(Drv.syntheticTypes.Failure).object(AS.object().content(err.message)),
        {},
        message
      ).activity
    ]
  }
}

type FlatActivity = {
  activity: DerivedActivity,
  conversation: Conversation,
  asideId: AsideId
}

type AsideId = Set<URI>

function flatAsides (conv: Conversation): Conversation {
  const flatActivities: Seq<FlatActivity> = m.sortBy(
    act => act.activity.publishTime,
    m.mapcat(act => flatHelper(m.set(), conv, act), conv.activities)
  )

  // Combine adjacent activities with same asideId into groups
  const activityGroups: Vector<Vector<FlatActivity>> = m.reduce(
    (groups, act) => {
      const group = m.last(groups)
      const lastAsideId = group ? m.first(group).asideId : null
      if (group && m.equals(lastAsideId, act.asideId)) {
        const updatedGroup = m.conj(group, act)
        return m.assoc(groups, m.count(groups) - 1, updatedGroup)
      } else {
        return m.conj(groups, m.vector(act))
      }
    },
    m.vector(),
    flatActivities
  )

  const activities = m.mapcat(group => {
    const asideId = m.first(group).asideId
    if (m.isEmpty(asideId)) {
      return m.map(a => a.activity, group)
    } else {
      const conv = m.first(group).conversation
      return m.seq([Drv.newAside(m.map(a => a.activity, group))])
    }
  }, activityGroups)

  return conv.set({ activities })
}

function flatHelper (
  asideId: AsideId,
  conversation: Conversation,
  activity: DerivedActivity
): Seq<FlatActivity> {
  const { aside } = activity
  if (activity.hasType(Drv.syntheticTypes.Aside) && aside) {
    const conv = asideToConversation(activity)
    const id = m.into(m.set(), m.map(a => a.uri, conv.flatParticipants))
    return m.mapcat(act => flatHelper(id, conv, act), aside)
  } else {
    return m.seq([{ asideId, activity, conversation }])
  }
}

function reduceConversation<R> (
  f: (r: R, a: DerivedActivity) => R,
  init: R,
  conv: Conversation
): R {
  return reduceHelper(f, init, conv.activities)
}

function reduceHelper<R> (
  f: (r: R, a: DerivedActivity) => R,
  init: R,
  acts: Seqable<DerivedActivity>
): R {
  if (m.isEmpty(acts)) {
    return init
  }
  const act = m.first(acts)
  if (act.hasType(Drv.syntheticTypes.Aside)) {
    return reduceHelper(f, init, m.concat(act.aside || m.list(), m.rest(acts)))
  } else {
    return reduceHelper(f, f(init, act), m.rest(acts))
  }
}
