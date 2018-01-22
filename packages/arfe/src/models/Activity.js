/* @flow */

import * as AS from 'activitystrea.ms'
import * as m from 'mori'
import toString from 'stream-to-string'
import traverse from 'traverse'
import * as Vocab from 'vocabs-as'
import Address from './Address'
import Message, * as Msg from './Message'
import * as Part from './MessagePart'
import * as U from './uri'
import * as asutil from '../util/activity'
import { catMaybes } from '../util/maybe'
import { uniqBy } from '../util/mori'

import type { ValueIterator } from 'activitystrea.ms'
import type Moment from 'moment'
import type { Seq, Seqable } from 'mori'
import type { Readable } from 'stream'
import type { MessagePart } from './MessagePart'
import type { URI } from './uri'

export default class Activity {
  activity: AS.models.Activity // underlying activitystrea.ms activity
  message: ?Message // message that delivered activity, for context

  constructor (
    activity: AS.models.Activity,
    message?: Message,
    part?: MessagePart
  ) {
    const normalized = message
      ? syncMetadata(activity, message, part)
      : activity
    this.activity = normalized
    this.message = message
  }

  get id (): URI {
    if (!this.activity.id) {
      throw new Error('activity does not have an ID value')
    }
    return this.activity.id
  }

  get actor (): ?AS.models.Object {
    return oneFromIterable(this.activity.actor)
  }

  // If the activity has multiple objects, this returns the first
  get object (): ?AS.models.Object {
    return oneFromIterable(this.activity.object)
  }

  get objects (): AS.models.Object[] {
    return arrayFromIterable(this.activity.object)
  }

  // Only works if activity included content inline
  get objectContent (): ?string {
    const obj = this.activity.object
    if (obj) {
      return obj.first.content
    }
  }

  get objectLinks (): Seq<AS.models.Link> {
    const objs = arrayFromIterable(this.activity.object)
    const bareLinks = m.filter(obj => hasType(Vocab.Link, obj), objs)
    const nestedLinks = m.mapcat(obj => arrayFromIterable(obj.url), objs)
    return m.concat(bareLinks, nestedLinks)
  }

  get objectUri (): ?URI {
    return m.first(this.objectUris)
  }

  get objectUris (): Seq<URI> {
    const linkHrefs = m.map(l => l.href, this.objectLinks)
    const objectIds = m.map(
      obj => obj.id,
      arrayFromIterable(this.activity.object)
    )
    return catMaybes(m.concat(linkHrefs, objectIds))
  }

  get publishTime (): ?Moment {
    if (this.message) {
      return this.message.receivedDate
    }
  }

  get resultLinks (): Seq<AS.models.Link> {
    const objs = arrayFromIterable(this.activity.result)
    const bareLinks = m.filter(obj => hasType(Vocab.Link, obj), objs)
    const nestedLinks = m.mapcat(obj => arrayFromIterable(obj.url), objs)
    return m.concat(bareLinks, nestedLinks)
  }

  get resultUri (): ?URI {
    const uris = m.map(l => l.href, this.resultLinks)
    return m.first(uris)
  }

  get target (): ?(AS.models.Link | AS.models.Object) {
    return oneFromIterable(this.activity.target)
  }

  get targetLinks (): Seq<AS.models.Link> {
    const targets = arrayFromIterable(this.activity.target)
    return m.mapcat(target => arrayFromIterable(target.url), targets)
  }

  get title (): ?AS.models.LanguageValue {
    const object = this.object
    const name = object && object.name
    if (name) {
      return name
    }
    if (this.message) {
      return this.message.subject
    }
  }

  get types (): URI[] {
    return getTypes(this.activity)
  }
}

function getTypes (object: AS.models.Object): URI[] {
  const type = object.type
  if (!type) {
    return []
  } else if (typeof type === 'string') {
    return [type]
  } else {
    return type
  }
}

function hasType (type: URI, object: AS.models.Object): boolean {
  return getTypes(object).some(t => type === t)
}

/* reading activities from messages */

export async function getActivities (
  fetchPartContent: (msg: Message, Part.PartRef) => Promise<Readable>,
  msg: Message
): Promise<Seqable<Activity>> {
  const activityParts = m.filter(part => !!part.id, msg.activityParts)

  if (!m.isEmpty(activityParts)) {
    return Promise.all(
      m.intoArray(
        m.map(getActivity.bind(null, fetchPartContent, msg), activityParts)
      )
    )
  } else {
    const activity = messageAsActivity(msg)
    return [new Activity(activity, msg)]
  }
}

async function getActivity (
  fetchPartContent: (msg: Message, Part.PartRef) => Promise<Readable>,
  msg: Message,
  part: MessagePart
): Promise<Activity> {
  const contentId = part.id && Part.contentId(Msg.idFromHeaderValue(part.id))
  const partId = part.partID && Part.partId(part.partID)
  const partRef = contentId || partId
  if (!partRef) {
    throw new Error('cannot fetch content for message part with no ID')
  }
  const stream = await fetchPartContent(msg, partRef)
  return importActivity(msg, stream, part)
}

export async function importActivity (
  msg: Message,
  stream: Readable,
  part?: MessagePart
): Promise<Activity> {
  const content = await toString(stream, 'utf8')
  const json = JSON.parse(content)

  // Expand any relative `cid:` URIs in the activity.
  const fullyQualified = traverse(json).map(function (x) {
    if (typeof x === 'string') {
      this.update(msg.resolveUri(x))
    }
  })

  const act = await asutil.importObject(fullyQualified)
  return new Activity(act, msg, part)
}

function messageAsActivity (msg: Message): AS.models.Activity {
  const contentLinks = m.map(
    part =>
      AS.link()
        .mediaType(Part.contentType(part))
        .href(msg.uriForPart(part))
        .get(),
    msg.allContentParts
  )

  return AS.create()
    .id(msg.uri)
    .object(AS.note().name(msg.subject).url(m.intoArray(contentLinks)).get())
    .get()
}

// True up activity metadata with email message metadata
function syncMetadata (
  act: AS.models.Activity,
  msg: Message,
  part?: MessagePart
): AS.models.Activity {
  let normalized = asutil.modify(a => {
    a.id(part ? msg.uriForPart(part) : msg.uri)
    a.to().to(mergeAddresses(msg.to, act.to))
    a.cc().cc(mergeAddresses(msg.cc, act.cc))
    a.bcc().bcc(mergeAddresses(msg.bcc, act.bcc))
  }, act)

  if (addressMismatch(msg.from, act.actor)) {
    normalized = asutil.modify(a => {
      a.attributedTo().attributedTo(act.actor)
      const from = msg.from
      if (from) {
        a.actor().actor(from.map(addressAsObject))
      }
    }, normalized)
  } else {
    normalized = asutil.modify(a => {
      a.actor(mergeAddresses(msg.from, act.actor))
    }, normalized)
  }

  return normalized
}

function mergeAddresses (
  xs: ?(Address[]),
  ys: ?ValueIterator<AS.models.Base>
): AS.models.Object[] {
  const addrs_ = ys ? ys.toArray() : []
  if (!xs) {
    return []
  }
  return xs.map(addr => {
    const y = addrs_.find(addr_ => U.sameUri(addr.uri, addr_.id))
    return y || addressAsObject(addr)
  })
}

function addressAsObject (addr: Address): AS.models.Object {
  // TODO: distinguish individual vs group, probably by looking for mailing list
  // headers in msg
  return AS.person().id(addr.uri).name(addr.name).get()
}

function addressMismatch (
  addrs: ?(Address[]),
  actor: ?ValueIterator<AS.models.Base>
): boolean {
  if (!addrs || !actor) {
    return false
  }
  const xs = m.set(addrs.map(a => a.uri))
  const ys = m.set(actor.toArray().map(a => a.id))

  // TODO: normalize URIs when making this comparison
  return m.equals(xs, ys)
}

/* smart getters */

export function participants (
  activities: Seqable<Activity>
): {
  to: Seqable<Address>,
  from: Seqable<Address>,
  cc: Seqable<Address>
} {
  const { to, from, cc } = m.reduce(
    (ls, activity) => {
      const message = activity.message
      if (!message) {
        return ls
      } // TODO: Fall back to reading participants from activity?
      return {
        to: m.filter(addr => !!addr, m.concat(ls.to, message.to)),
        from: m.filter(addr => !!addr, m.concat(ls.from, message.from)),
        cc: m.filter(addr => !!addr, m.concat(ls.cc, message.cc))
      }
    },
    { to: m.vector(), from: m.vector(), cc: m.vector() },
    activities
  )
  return {
    to: uniqBy(a => a.email, to),
    from: uniqBy(a => a.email, from),
    cc: uniqBy(a => a.email, cc)
  }
}

export function flatParticipants (activities: Seqable<Activity>): Seq<Address> {
  const { from, to, cc } = participants(activities)
  return uniqBy(
    a => a.email,
    m.concat(m.reverse(from), m.reverse(to), m.reverse(cc))
  )
}

function oneFromIterable<T> (iter: ?ValueIterator<T>): ?T {
  return iter && iter.first
}

function arrayFromIterable<T> (iter: ?ValueIterator<T>): T[] {
  return iter ? Array.from(iter) : []
}
