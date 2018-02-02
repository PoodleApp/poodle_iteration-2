/* @flow */

import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import * as Part from 'arfe/lib/models/MessagePart'
import * as m from 'mori'
import * as React from 'react'

type Props = {
  activity: DerivedActivity
}

export default function ShowAttachments ({ activity }: Props) {
  const message = activity.message
  const attachments = activity.attachments
  if (!message) {
    return <section />
  }
  const as = m.map(a => {
    const uri = message.uriForPart(a)
    const filename = a.params && a.params.filename
    return (
      <div key={uri}>
        <a href={uri} download={filename || 'file'}>
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
