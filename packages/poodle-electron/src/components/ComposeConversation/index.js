/* @flow */

import * as authActions from 'poodle-core/lib/actions/auth'
import * as React from 'react'

type Props = {
  account: authActions.Account,
  draftId: string
}

export default function ComposeConversation (props: Props) {
  if (props.draftId) {
    return <div>draftId: {props.draftId}</div>
  } else {
    return <div>waiting for draftId...</div>
  }
}
