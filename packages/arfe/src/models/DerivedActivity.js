/* @flow */

import * as AS from 'activitystrea.ms'
import * as m from 'mori'
import * as Vocab from 'vocabs-as'
import * as asutil from '../util/activity'
import Activity from './Activity'
import Message from './Message'
import * as Part from './MessagePart'
import { mailtoUri, sameUri } from './uri'

import type { List, Map, Seq, Seqable } from 'mori'
import type Moment from 'moment'
import type { URI } from './uri'

type ConstructorOpts = {
  original?: ?Activity, // original activity, for context; for non-synthetic cases activity === original
  aside?: ?Seqable<DerivedActivity>,
  likes?: ?Map<URI, DerivedActivity>, // map from actor URIs to activities expressing likes
  prevRevisions?: ?List<Revision>, // prior revisions, not including the current revision
  updateActivity?: DerivedActivity // if constructing a revised activity, this is the update that produced the revision
}

type Revision = {
  revision: DerivedActivity,
  updateActivity: ?DerivedActivity
}

export default class DerivedActivity {
  activity: Activity // possibly synthetic (e.g., not originating from a message, and with a made-up 'type')
  original: ?Activity // original activity, for context; for non-synthetic cases activity === original
  aside: ?Seqable<DerivedActivity>
  likes: Map<URI, DerivedActivity> // map from actor URIs to activities expressing likes
  prevRevisions: List<Revision>
  updateActivity: ?DerivedActivity

  constructor (activity: Activity, opts: ConstructorOpts = {}) {
    this.activity = activity
    this.original = opts.original
    this.aside = opts.aside
    this.likes = opts.likes || m.hashMap()
    this.prevRevisions = opts.prevRevisions || m.list()
    this.updateActivity = opts.updateActivity
  }

  /* setters */

  revise (
    activity: AS.models.Activity,
    updateActivity: DerivedActivity
  ): DerivedActivity {
    return new DerivedActivity(new Activity(activity), {
      original: this.original,
      aside: this.aside,
      likes: this.likes,
      prevRevisions: this.revisions, // push `this` into revisions list
      updateActivity
    })
  }

  set (opts: ConstructorOpts) {
    return new DerivedActivity(this.activity, {
      original: this.original,
      aside: opts.aside || this.aside,
      likes: opts.likes || this.likes,
      prevRevisions: this.prevRevisions
    })
  }

  /* smart getters */

  get isSynthetic (): boolean {
    return this.id.startsWith('synthetic:')
  }

  get likeCount (): number {
    return m.count(this.likes)
  }

  likedBy (id: URI): boolean {
    return !!m.get(this.likes, id)
  }

  hasObjectType (type: URI): ?boolean {
    // `type` property might be an array
    const types = m.mapcat(
      obj => (typeof obj.type === 'string' ? [obj.type] : obj.type),
      this.objects
    )
    return m.some(t => t === type, types)
  }

  get publishTime (): ?Moment {
    // This one gets the original, rather than revised, view of an activity
    if (this.original) {
      return this.original.publishTime
    } else if (this.aside) {
      const first = m.first(this.aside)
      if (!first) {
        throw 'no first activity in aside'
      } // TODO
      return first.publishTime
    } else {
      return this.activity.publishTime
    }
  }

  get latestEditTime (): ?Moment {
    if (this.aside) {
      const first = m.first(this.aside)
      if (!first) {
        throw 'no first activity in aside'
      } // TODO
      return first.publishTime
    } else {
      return this.activity.publishTime
    }
  }

  get isEdited (): boolean {
    return !m.isEmpty(this.prevRevisions)
  }

  get title (): ?AS.models.LanguageValue {
    return this.object && this.object.name
  }

  /* convenience getters that delegate to the `Activity` model */

  get actor (): ?AS.models.Object {
    const a = this.activity.actor
    if (!a && this.original) {
      return this.original.actor
    }
    return a
  }

  hasType (type: URI): boolean {
    return this.types.some(t => type === t)
  }

  get id (): URI {
    return this.activity.id
  }

  // If the activity has been revised, there are certain circumstances where it
  // should be addressable by the ID of any of its revisions. (E.g., when
  // computing like counts.)
  hasId (uri: URI): boolean {
    return !!m.some(({ revision }) => sameUri(uri, revision.id), this.revisions)
  }

  // As with `hasId`, but for object references
  hasObjectUri (uri: URI): boolean {
    return !!m.some(
      ({ revision }) => m.some(uri_ => sameUri(uri, uri_), revision.objectUris),
      this.revisions
    )
  }

  get message (): ?Message {
    return this.original ? this.original.message : this.activity.message
  }

  // If the activity has multiple objects, this returns the first
  get object (): ?AS.models.Object {
    return this.activity.object
  }

  get objects (): AS.models.Object[] {
    return this.activity.objects
  }

  get objectLinks (): Seq<AS.models.Link> {
    return this.activity.objectLinks
  }

  get objectUri (): ?URI {
    return this.activity.objectUri
  }

  get objectUris (): Seq<URI> {
    return this.activity.objectUris
  }

  get objects (): AS.models.Object[] {
    return this.activity.objects
  }

  get resultUri (): ?URI {
    return this.activity.resultUri
  }

  // Return revisions (including the current revision) from latest to oldest
  get revisions (): List<Revision> {
    return m.cons(
      { revision: this, updateActivity: this.updateActivity },
      this.prevRevisions
    )
  }

  get targetLinks (): Seq<AS.models.Link> {
    return this.activity.targetLinks
  }

  get types (): URI[] {
    return this.activity.types
  }

  get attachments (): Seqable<Part.MessagePart> {
    const msg = this.message
    return msg ? msg.attachmentParts : []
  }
}

/* specialized constructors */

export function fromActivity (activity: Activity): DerivedActivity {
  return new DerivedActivity(activity, {
    message: activity.message,
    original: activity
  })
}

export function newSyntheticActivity (
  activity: AS.models.Activity,
  opts: ConstructorOpts = {},
  message?: Message
): DerivedActivity {
  const withId = asutil.modify(a => a.id(syntheticId()), activity)
  return new DerivedActivity(new Activity(withId, message), opts)
}

/* synthetic types */

const syntheticVerbBaseUri = 'http://sitr.us/ns/activitystreams#'

function syntheticType (t: string): string {
  return syntheticVerbBaseUri + t
}

export const syntheticTypes = {
  Aside: syntheticType('Aside'),
  Conflict: syntheticType('Conflict'),
  Failure: syntheticType('Failure'),
  Join: syntheticType('Join')
}

// TODO: These might have to be stable: the same activity should always get the
// same synthetic id
let _syntheticId = 0
function syntheticId (): URI {
  return `synthetic:${_syntheticId++}`
}

export function newAside (
  activities: Seqable<DerivedActivity>
): DerivedActivity {
  return newSyntheticActivity(AS.activity(syntheticTypes.Aside).get(), {
    aside: activities
  })
}

export function newConflict (activity: DerivedActivity): DerivedActivity {
  return newSyntheticActivity(
    AS.models.Activity(syntheticTypes.Conflict).get(),
    { original: activity.original }
  )
}

/* utilities */

// Eventually we will enable metadata to allow activity authors to grant edit
// permissions to content. For now the rules are:
// - anyone can edit a document
// - authors can edit their own content
export function canEdit (x: DerivedActivity, y: DerivedActivity): boolean {
  return x.hasObjectType(Vocab.Document) || sameActor(x, y)
}

export function sameActor (x: DerivedActivity, y: DerivedActivity): boolean {
  // TODO: more robust URI comparisons
  var ax = x.actor
  var ay = y.actor
  return !!ax && !!ay && ax.uri === ay.uri
}
