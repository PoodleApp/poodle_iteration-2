/* @flow */

import ArfeConversation from 'arfe/lib/models/Conversation'
import AppBar from 'material-ui/AppBar'
import Divider from 'material-ui/Divider'
import IconButton from 'material-ui/IconButton'
import RaisedButton from 'material-ui/RaisedButton'
import * as colors from 'material-ui/styles/colors'
import spacing from 'material-ui/styles/spacing'
import * as m from 'mori'
import * as authActions from 'poodle-core/lib/actions/auth'
import { languageValue } from 'poodle-core/lib/components/Lang'
import * as q from 'poodle-core/lib/queries/conversation'
import { type Slurp, slurp } from 'poodle-core/lib/slurp'
import { observable } from 'poodle-core/lib/slurp/effects'
import Sync from 'poodle-service/lib/sync'
import React from 'react'
import * as redux from 'react-redux'
import * as router from 'react-router-redux'

import ActivityView from '../ActivityView'
import ComposeReply from '../ComposeReply'

import type { Match } from 'react-router-dom'
import type { Dispatch } from 'redux'
import type { State } from '../../reducers'

type OwnProps = {
  account: authActions.Account,
  conversationId: string
}

type Props = OwnProps & {
  conversation: Slurp<ArfeConversation>,
  dispatch: Dispatch<any>,
  editing: ?ActivityId
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
  const { value: conversation, error, latest } = props.conversation

  let content
  if (error && latest === error) {
    content = (
      <div>
        <p>
          {String(error)}
        </p>
        <RaisedButton
          label='Retry'
          onClick={() => alert('TODO: implement "retry" action')}
        />
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
            loading={false}
          />,
        conversation.activities
      )
    )
    content = (
      <div>
        {activities}
        <ComposeReply
          account={props.account}
          conversation={conversation}
          loading={false}
          send={(...args) => {
            alert('TODO: implement send')
          }}
          showAddPeople={false}
          toggleShowAddPeople={(...args) => {
            alert('TODO: implement add people')
          }}
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
              {conversation ? languageValue(conversation.subject) : '...'}
            </span>
          }
          iconElementLeft={
            <IconButton iconClassName='material-icons'>arrow_back</IconButton>
          }
          iconElementRight={
            <IconButton iconClassName='material-icons'>refresh</IconButton>
          }
          onLeftIconButtonTouchTap={() => dispatch(router.goBack())}
          onRightIconButtonTouchTap={() =>
            alert('TODO: implement refresh action')}
        />
      </header>
      <div style={styles.body}>
        <main style={styles.content}>
          {content}
        </main>
      </div>
    </div>
  )
}

const ComponentWithState = redux.connect(function mapStateToProps (
  state: State
): $Shape<Props> {
  return {
    editing: null // TODO
  }
})(Conversation)

const ComponentWithData = slurp(
  ({ auth }: State, { conversationId }: OwnProps) => ({
    conversation: observable(q.fetchConversation, auth.sync, conversationId)
  })
)(ComponentWithState)

export default ComponentWithData
