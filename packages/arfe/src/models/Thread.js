/* @flow */

import * as m from 'mori'
import Activity from './Activity'
import { midUri } from './uri'
import { catMaybes } from '../util/maybe'
import { partition, subtract, uniqBy } from '../util/mori'

import type { Seq, Seqable, Set } from 'mori'
import type { MessageId } from './Message'
import type { URI } from './uri'

export type Thread = Seqable<[Activity, Thread]>

export function buildThread (messages: Seqable<Activity>): Thread {
  return m.reduce(insertMessage, singleton(m.first(messages)), m.rest(messages))
}

function singleton (message: Activity): Thread {
  return m.vector([message, m.vector()])
}

function insertMessage (thread: Thread, message: Activity): Thread {
  const msgs = uniqBy(a => a.id, m.concat(getActivities(thread), [message]))
  const context = msgs
  let [toplevel, replies] = partition(
    msg => !m.some(m => ancestorOf(context, msg, m), msgs),
    msgs
  )
  return m.map(msg => assembleTree(msg, replies), toplevel)
}

// Assemble a subthread. Assumes that every message in `messages` is either
// a descendent of `message`, or belongs in a parallel subthread. In other
// words, there is no member of `messages` that is an ancestor of `message`.
function assembleTree (
  message: Activity,
  messages: Seqable<Activity>
): [Activity, Thread] {
  const context = messages
  const descendents = m.filter(
    msg => msg !== message && ancestorOf(context, msg, message),
    messages
  )
  let [replies, subreplies] = partition(
    msg => !m.some(m => m !== msg && ancestorOf(context, msg, m), descendents),
    descendents
  )
  const subthread = m.map(msg => assembleTree(msg, subreplies), replies)
  return [message, sortReplies(subthread)]
}

export function getActivities (thread: Thread): Seq<Activity> {
  const allActs = m.mapcat(
    ([act, subthread]) => m.cons(act, getActivities(subthread)),
    thread
  )
  return m.sortBy(a => a.publishTime, allActs)
}

export function getId (thread: Thread): string {
  const [act, _] = m.first(thread)
  return act.id
}

export function getReferences (thread: Thread): Seqable<string> {
  return foldThread(
    (references, activity) => {
      const messageId = activity.message && activity.message.id
      if (messageId) {
        references.push(messageId)
      }
      return references
    },
    [],
    thread
  )
}

// Returns `true` if `y` is an ancestor of `x`
function ancestorOf (
  context: Seqable<Activity>,
  x: Activity,
  y: Activity
): ?boolean {
  return m.some(id => y.id === id, ancestors(context, x))
}

// A message might not come with a complete list of its references - there is
// a limit on the size of the `references` header. This function works around
// that issue by recursively loading the references of the references of
// a message.
function ancestors (
  context: Seqable<Activity>,
  activity: Activity,
  accum: Set<MessageId> = m.set()
): Set<URI> {
  const msg = activity.message
  if (!msg) {
    throw new Error(
      'Cannot determine ancestors of activity with no message context'
    )
  }

  const refs = catMaybes(m.conj(m.seq(msg.references), msg.inReplyTo))
  const updatedAccum = m.into(accum, m.map(midUri, refs))
  const addedIds = subtract(updatedAccum, accum)
  const prevMsgs = m.filter(
    act => m.some(id => id === act.id, addedIds),
    context
  )
  if (m.isEmpty(prevMsgs)) {
    return updatedAccum
  } else {
    return m.reduce(
      (uris, act) => ancestors(context, act, uris),
      updatedAccum,
      prevMsgs
    )
  }
}

function sortReplies (replies: Thread): Thread {
  return m.sortBy(([act, _]) => act.publishTime, replies)
}

export function foldThread<T> (
  reducer: (accum: T, msg: Activity) => T,
  init: T,
  thread: Thread
): T {
  return m.reduce(reducer, init, getActivities(thread))
}
