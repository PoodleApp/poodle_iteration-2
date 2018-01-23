/* @flow */

import * as Addr from 'arfe/lib/models/Address'
import { type Participants } from 'arfe/lib/models/Conversation'
import TextField from 'material-ui/TextField'
import * as React from 'react'

type Props = {
  onRecipientsChange: (recipients: Participants) => void,
  recipients: ?Participants
}

export default function EditRecipients (props: Props) {
  const recipients = props.recipients || { to: [], from: [], cc: [] }
  return (
    <TextField
      hintText={'To:'}
      multiLine={false}
      fullWidth={true}
      name='recipients'
      onChange={event => {
        const to = Addr.parseAddressList(event.currentTarget.value || '')
        props.onRecipientsChange({
          ...recipients,
          to
        })
      }}
    />
  )
}
