/* @flow */

import FloatingActionButton from 'material-ui/FloatingActionButton'
import ContentAdd from 'material-ui/svg-icons/content/add'
import * as auth from 'poodle-core/lib/actions/auth'
import * as chrome from 'poodle-core/lib/actions/chrome'
import * as React from 'react'
import * as redux from 'react-redux'

type Props = {
  onNewDiscussion(account: auth.Account): void
}

export function ComposeButton (props: Props) {
  return (
    <FloatingActionButton onClick={props.onNewDiscussion}>
      <ContentAdd />
    </FloatingActionButton>
  )
}

const ComposeButtonWithActions = redux.connect(null, (dispatch, ownProps) => {
  return {
    onNewDiscussion() {
      dispatch(chrome.composeNewDiscussion(ownProps.account))
    }
  }
})(ComposeButton)

export default ComposeButtonWithActions
