/* @flow */

import Conversation, { type Participants } from 'arfe/lib/models/Conversation'
import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import { type Dispatch } from 'redux'
import * as redux from 'react-redux'
import { type Account } from '../actions/auth'
import * as compose from './actions'
import { type State, getContent, isSending } from './reducer'

type ExpectedProps = {
  account: Account,
  draftId: ID
}

// Props that will be available on a decorated component, including props that
// from `ExpectedProps`, which must be passed in.
export type Props = {
  account: Account,
  content: string,
  draftId: ID,
  dispatch: (action: Object) => void,
  onContentChange: (content: string) => void,
  onEdit: (
    activity: DerivedActivity,
    conversation: Conversation,
    recipients: Participants,
    content: compose.Content
  ) => void,
  onReply: (
    conversation: Conversation,
    recipients: Participants,
    content: compose.Content
  ) => void,
  onNewDiscussion: (
    recipients: Participants,
    content: compose.Content,
    subject: string
  ) => void,
  sending: boolean
}

export type ID = string

export function ComposeHOC<OwnProps: ExpectedProps, TopState: Object> (
  component: *
) {
  function mapStateToProps<S: { compose: State }> (
    state: S,
    ownProps: OwnProps
  ) {
    return {
      content: getContent(state.compose, ownProps.draftId),
      sending: isSending(state.compose, ownProps.draftId)
    }
  }
  function mapDispatchToProps (
    dispatch: Dispatch<*>,
    { draftId, account }: OwnProps
  ) {
    return {
      dispatch,
      onContentChange (...args) {
        dispatch(compose.setContent(draftId, ...args))
      },
      onEdit (...args) {
        dispatch(compose.edit(draftId, account, ...args))
      },
      onReply (...args) {
        dispatch(compose.reply(draftId, account, ...args))
      },
      onNewDiscussion (...args) {
        dispatch(compose.newDiscussion(draftId, account, ...args))
      }
    }
  }
  return redux.connect(mapStateToProps, mapDispatchToProps)(component)
}
