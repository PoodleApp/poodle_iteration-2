/* @flow */

import AppBar           from 'material-ui/AppBar'
import Divider          from 'material-ui/Divider'
import IconButton       from 'material-ui/IconButton'
import RaisedButton     from 'material-ui/RaisedButton'
import * as colors      from 'material-ui/styles/colors'
import spacing          from 'material-ui/styles/spacing'
import * as authActions from 'poodle-core/lib/actions/auth'
import * as q           from 'poodle-core/lib/queries/localConversation'
import React            from 'react'
import * as apollo      from 'react-apollo'
import * as redux       from 'react-redux'
import * as router      from 'react-router-redux'

import ActivityView from '../ActivityView'

import type { Match } from 'react-router-dom'
import type { State } from '../../reducers'

type ConversationProps = {
  account:        authActions.Account,
  conversationId: string,
  data:           q.LocalConversation,
  dispatch:       Dispatch<any>,
  editing:        ?ActivityId,
}

type ActivityId = string

const styles = {
  authorName: {
    color: colors.darkBlack,
  },
  body: {},
  content: {
    flex: 1,
    padding: spacing.desktopGutter + 'px',
  },
  leftNav: {
    flex: `0 0 ${spacing.desktopKeylineIncrement * 3}px`,
    order: -1,
  },
  root: {
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
  },
  title: {
    cursor: 'pointer',
  },
}

export function Conversation(props: ConversationProps) {
  const dispatch = props.dispatch
  const { conversation, error, loading } = props.data

  let content
  if (loading) {
    content = <div>Loading...</div>
  }
  else if (error) {
    content = <div>
      <p>{String(error)}</p>
      <RaisedButton label="Retry" onClick={props.data.refetch} />
    </div>
  }
  else if (!conversation) {
    content = <div>
      <p>Conversation not found: {props.conversationId}</p>
      <RaisedButton label="Retry" onClick={props.data.refetch} />
    </div>
  }
  else {
    const activities = conversation.activities.map(
      act => <ActivityView
        key={act.id}
        activity={act}
        conversation={conversation}
        loading={false}
        {...props}
      />
    )
    content = <div>{activities}</div>
  }

  return <div style={styles.root}>
    <header>
      <AppBar
        title={<span style={styles.title}>{conversation ? conversation.subject : '...'}</span>}
        iconElementLeft={
          <IconButton iconClassName="material-icons">arrow_back</IconButton>
        }
        iconElementRight={
          <IconButton iconClassName="material-icons">refresh</IconButton>
        }
        onLeftIconButtonTouchTap={() => dispatch(router.goBack())}
        onRightIconButtonTouchTap={() => props.data.refetch()}
      />
    </header>
    <div style={styles.body}>
      <main style={styles.content}>{content}</main>
    </div>
  </div>
}

function mapStateToProps({ apollo }: State): $Shape<ConversationProps> {
  return {
    editing: null, // TODO
  }
}

const withState = redux.connect(mapStateToProps)

const withData = apollo.graphql(q.localConversation, {
  options: ({ conversationId }: ConversationProps) => ({
    variables: {
      id:   conversationId,
      lang: navigator.language,
    },
  })
})

export default withData(withState(Conversation))
