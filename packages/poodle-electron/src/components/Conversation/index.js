/* @flow */

import * as LV from 'arfe/lib/models/LanguageValue'
import * as kefir from 'kefir'
import AppBar from 'material-ui/AppBar'
import Divider from 'material-ui/Divider'
import IconButton from 'material-ui/IconButton'
import RaisedButton from 'material-ui/RaisedButton'
import * as colors from 'material-ui/styles/colors'
import spacing from 'material-ui/styles/spacing'
import * as m from 'mori'
import * as authActions from 'poodle-core/lib/actions/auth'
import { type Slurp, slurp } from 'poodle-core/lib/slurp'
import * as tasks from 'poodle-service/lib/tasks'
import React from 'react'
import * as redux from 'react-redux'
import * as router from 'react-router-redux'
import { perform } from '../../imapClient'

import ActivityView from '../ActivityView'
import ComposeButton from '../ComposeButton'
import ComposeReply from '../ComposeReply'

import type { Match } from 'react-router-dom'
import type { Dispatch } from 'redux'
import type { State } from '../../reducers'

type OwnProps = {
  account: authActions.Account,
  conversationId: string
}

type Props = OwnProps & {
  data: Slurp<tasks.LiveConversation>,
  dispatch: Dispatch<any>,
  editing?: ActivityId[],
  pendingLikes: ActivityId[]
}

type ActivityId = string

const styles = {
  authorName: {
    color: colors.darkBlack
  },
  body: {},
  content: {
    flex: 1,
    padding: spacing.desktopGutter + 'px'
  },
  leftNav: {
    flex: `0 0 ${spacing.desktopKeylineIncrement * 3}px`,
    order: -1
  },
  root: {
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column'
  },
  title: {
    cursor: 'pointer'
  }
}

export function Conversation (props: Props) {
  const dispatch = props.dispatch
  const { value, error, latest } = props.data
  const conversation = value && value.conversation
  const changes = value && value.changes

  let content
  if (error && latest === error) {
    content = (
      <div>
        <p>
          {String(error)}
        </p>
        <RaisedButton label='Retry' onClick={props.data.reload} />
      </div>
    )
  } else if (conversation) {
    const activities = m.intoArray(
      m.map(
        activity =>
          <ActivityView
            key={activity.id}
            account={props.account}
            activity={activity}
            conversation={conversation}
            dispatch={props.dispatch}
            editing={props.editing}
            pendingLikes={props.pendingLikes}
          />,
        conversation.activities
      )
    )
    const replyDraftId = `${conversation.id}-reply`
    content = (
      <div>
        {activities}
        <ComposeReply
          account={props.account}
          conversation={conversation}
          draftId={replyDraftId}
        />
      </div>
    )
  } else {
    content = <div>Loading...</div>
  }

  return (
    <div style={styles.root}>
      <header>
        <AppBar
          title={
            <span style={styles.title}>
              {conversation ? LV.getString(conversation.subject) : '...'}
            </span>
          }
          iconElementLeft={
            <IconButton iconClassName='material-icons'>arrow_back</IconButton>
          }
          iconElementRight={
            <IconButton iconClassName='material-icons'>refresh</IconButton>
          }
          onLeftIconButtonTouchTap={() => dispatch(router.goBack())}
          onRightIconButtonTouchTap={props.data.reload}
        />
      </header>
      <div style={styles.body}>
        <main style={styles.content}>
          {content}
        </main>
      </div>
      <ComposeButton account={props.account} />
    </div>
  )
}

export default slurp(
  ({ auth, chrome, queue }: State, { conversationId }: OwnProps) => {
    const email = auth.account && auth.account.email
    const data = email
      ? perform(tasks.watchConversation, [conversationId], {
        accountName: email
      })
      : perform(tasks.Task.error, [new Error('not logged in')])
    return {
      data,
      editing: chrome.editing,
      pendingLikes: queue.pendingLikes || []
    }
  }
)(Conversation)
