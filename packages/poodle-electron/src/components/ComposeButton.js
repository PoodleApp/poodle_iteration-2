/* @flow */

import FloatingActionButton from 'material-ui/FloatingActionButton'
import spacing from 'material-ui/styles/spacing'
import ContentAdd from 'material-ui/svg-icons/content/add'
import * as auth from 'poodle-core/lib/actions/auth'
import * as chrome from 'poodle-core/lib/actions/chrome'
import * as React from 'react'
import { type Dispatch } from 'redux'
import * as redux from 'react-redux'

const styles = {
  floatingButton: {
    margin: 0,
    top: 'auto',
    right: spacing.desktopGutter + 'px',
    bottom: spacing.desktopGutter + 'px',
    left: 'auto',
    position: 'fixed',
    zIndex: 505
  }
}

type Props = {
  account: auth.Account,
  onNewDiscussion(): void
}

export function ComposeButton (props: Props) {
  return (
    <FloatingActionButton
      onClick={props.onNewDiscussion}
      style={styles.floatingButton}
    >
      <ContentAdd />
    </FloatingActionButton>
  )
}

const ComposeButtonWithActions = redux.connect(
  null,
  (dispatch: Dispatch<*>, ownProps) => {
    return {
      onNewDiscussion () {
        dispatch(chrome.composeNewDiscussion(ownProps.account))
      }
    }
  }
)(ComposeButton)

export default ComposeButtonWithActions
