/* @flow */

import * as Addr from 'arfe/lib/models/Address'
import Conversation, { type Participants } from 'arfe/lib/models/Conversation'
import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import { type Dispatch } from 'redux'
import * as redux from 'react-redux'
import { type Account } from '../actions/auth'
import * as compose from './actions'
import * as reducer from './reducer'

export { default as reducer } from './reducer'
export type { State } from './reducer'
export { default as sagas } from './sagas'

type ExpectedProps = {
  account: Account,
  draftId: ID
}

// Props that will be available on a decorated component, including props that
// from `ExpectedProps`, which must be passed in.
export type Props = {
  account: Account,
  content: ?compose.Content,
  draftId: ID,
  dispatch: (action: Object) => void,
  onContentChange: (_: compose.Content) => void,
  onDiscard: () => void,
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
    subject: ?string
  ) => void,
  onRecipientsChange: (recipients: compose.Recipients) => void,
  onSubjectChange: (subject: string) => void,
  recipients: ?compose.Recipients,
  participants: ?Participants,
  sending: boolean,
  subject: ?string,
  valid: boolean
}

export type ID = string

export function ComposeHOC<OwnProps: ExpectedProps, TopState: Object> (
  component: *
) {
  function mapStateToProps<S: { compose: reducer.State }> (
    state: S,
    ownProps: OwnProps
  ) {
    const { draftId } = ownProps
    const content = reducer.getContent(state.compose, draftId)
    const recipients = reducer.getRecipients(state.compose, draftId)
    const to = recipients && Addr.parseAddressList(recipients.to)
    const participants = to && {
      to,
      from: [],
      cc: []
    }
    return {
      content,
      recipients,
      participants,
      sending: reducer.isSending(state.compose, draftId),
      subject: reducer.getSubject(state.compose, draftId),
      valid: content && participants
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
      onDiscard () {
        dispatch(compose.discard(draftId))
      },
      onEdit (...args) {
        dispatch(compose.edit(draftId, account, ...args))
      },
      onReply (...args) {
        dispatch(compose.reply(draftId, account, ...args))
      },
      onNewDiscussion (...args) {
        dispatch(compose.newDiscussion(draftId, account, ...args))
      },
      onRecipientsChange (...args) {
        dispatch(compose.setRecipients(draftId, ...args))
      },
      onSubjectChange (...args) {
        dispatch(compose.setSubject(draftId, ...args))
      }
    }
  }
  return redux.connect(mapStateToProps, mapDispatchToProps)(component)
}
