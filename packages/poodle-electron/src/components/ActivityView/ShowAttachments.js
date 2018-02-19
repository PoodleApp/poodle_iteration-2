/* @flow */

import type DerivedActivity from 'arfe/lib/models/DerivedActivity'
import type Message from 'arfe/lib/models/Message'
import * as Part from 'arfe/lib/models/MessagePart'
import * as m from 'mori'
import { type Account } from 'poodle-core/lib/actions/auth'
import * as actions from 'poodle-core/lib/view/actions'
import * as React from 'react'

type Props = {
  activity: DerivedActivity,
  account: Account,
  dispatch: Function
}

export default function ShowAttachments ({
  account,
  activity,
  dispatch
}: Props) {
  const message = activity.message
  const attachments = activity.attachments
  if (!message) {
    return <section />
  }

  function openAttachment (attachment: Part.MessagePart, event: Event) {
    event.preventDefault()
    dispatch(actions.openAttachment({ message, attachment, account }))
  }

  const as = m.map(a => {
    const uri = message.uriForPart(a)
    const filename = a.params && a.params.name
    return (
      <div key={uri}>
        <a
          href={uri}
          download={filename || 'file'}
          onClick={event => openAttachment(a, event)}
        >
          {filename || 'file'} ({Part.contentType(a)}; {a.size} bytes)
        </a>
      </div>
    )
  }, attachments)
  return (
    <section>
      {(m.intoArray(as): any)}
    </section>
  )
}
