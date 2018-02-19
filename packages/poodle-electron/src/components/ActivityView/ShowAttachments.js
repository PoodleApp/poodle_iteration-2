/* @flow */

import type DerivedActivity from 'arfe/lib/models/DerivedActivity'
import type Message from 'arfe/lib/models/Message'
import * as Part from 'arfe/lib/models/MessagePart'
import { Card, CardActions, CardMedia, CardTitle } from 'material-ui/Card'
import FlatButton from 'material-ui/FlatButton'
import * as m from 'mori'
import { type Account } from 'poodle-core/lib/actions/auth'
import * as actions from 'poodle-core/lib/view/actions'
import * as React from 'react'

type Props = {
  activity: DerivedActivity,
  account: Account,
  dispatch: Function
}

export default function ShowAttachments (props: Props) {
  const message = props.activity.message
  const attachments = props.activity.attachments
  if (!message) {
    return <section />
  }
  const as = m.map(
    a => <Attachment attachment={a} message={message} {...props} />,
    attachments
  )
  return (
    <section>
      {(m.intoArray(as): any)}
    </section>
  )
}

type AttachmentProps = {
  account: Account,
  attachment: Part.MessagePart,
  dispatch: Function,
  message: Message
}

function Attachment ({
  account,
  attachment,
  dispatch,
  message
}: AttachmentProps) {
  const filename = (attachment.params && attachment.params.name) || 'file'
  const mediaType = Part.contentType(attachment)
  const size = attachment.size ? `${attachment.size} bytes` : ''

  function openAttachment (event: Event) {
    event.preventDefault()
    dispatch(actions.openAttachment({ message, attachment, account }))
  }

  return (
    <Card>
      <CardTitle
        title={filename || 'file'}
        subtitle={`${mediaType}; ${size}`}
      />
      <CardActions>
        <FlatButton label='View' onClick={openAttachment} />
        <FlatButton label='Save' disabled={true} />
      </CardActions>
    </Card>
  )
}
