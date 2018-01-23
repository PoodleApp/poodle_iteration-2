/* @flow */

import * as Addr from 'arfe/lib/models/Address'
import TextField from 'material-ui/TextField'
import * as compose from 'poodle-core/lib/compose/actions'
import * as React from 'react'

type Props = {
  onRecipientsChange: (recipients: compose.Recipients) => void,
  recipients: ?compose.Recipients
}

export default function EditRecipients (props: Props) {
  const recipients = props.recipients || {}
  const errorText = recipients.to && !Addr.parseAddressList(recipients.to)
    ? 'Invalid address list'
    : ''
  return (
    <TextField
      hintText={'To:'}
      multiLine={false}
      fullWidth={true}
      name='recipients'
      onChange={event => {
        const to = event.currentTarget.value
        props.onRecipientsChange({
          ...recipients,
          to
        })
      }}
      value={recipients.to || ''}
      errorText={errorText}
    />
  )
}
