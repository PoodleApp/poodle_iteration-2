/* @flow */

import Conversation from 'arfe/lib/models/Conversation'
import AppBar from 'material-ui/AppBar'
import Divider from 'material-ui/Divider'
import IconButton from 'material-ui/IconButton'
import { List, ListItem } from 'material-ui/List'
import Paper from 'material-ui/Paper'
import RaisedButton from 'material-ui/RaisedButton'
import * as colors from 'material-ui/styles/colors'
import spacing from 'material-ui/styles/spacing'
import Moment from 'moment'
import * as authActions from 'poodle-core/lib/actions/auth'
import React from 'react'
import * as redux from 'react-redux'
import { Link } from 'react-router-dom'

import Avatar from '../Avatar'
import ChannelListSidebar from './ChannelListSidebar'

import type { State } from '../../reducers'

type ActivityStreamProps = {
  account: authActions.Account,
  data: Object, // TODO
  dispatch: (action: Object) => void
}

const styles = {
  authorName: {
    color: colors.darkBlack
  },
  body: {
    display: 'flex',
    flex: 1
  },
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

export function ActivityStream (props: ActivityStreamProps) {
  const { conversations, error, loading } = props.data

  let content
  if (loading) {
    content = <div>Loading...</div>
  } else if (error) {
    content = (
      <div>
        <p>{String(error)}</p>
        <RaisedButton label='Retry' onClick={() => props.data.refetch()} />
      </div>
    )
  } else {
    const convs = conversations.map((conv, i) => (
      <div key={conv.id}>
        <ConversationRow conversation={conv} />
        {i == conversations.length - 1 ? '' : <Divider inset={true} />}
      </div>
    ))
    content = <Paper><List>{convs}</List></Paper>
  }

  return (
    <div style={styles.root}>
      <header>
        <AppBar
          title={<span style={styles.title}>Poodle</span>}
          iconElementRight={
            <IconButton iconClassName='material-icons'>refresh</IconButton>
          }
          onRightIconButtonTouchTap={() => props.data.refetch()}
        />
      </header>
      <div style={styles.body}>
        <main style={styles.content}>{content}</main>
        <nav style={styles.leftNav}>
          <ChannelListSidebar />
        </nav>
      </div>
    </div>
  )
}

type ConversationRowProps = {
  conversation: Conversation
}

function ConversationRow ({ conversation }: ConversationRowProps) {
  const subject = conversation.subject || '[no subject]'
  const activity = conversation.latestActivity
  const actor = activity.actor
  const snippet = activity.contentSnippet

  return (
    <ListItem
      leftAvatar={<Avatar name={actor.name} id={actor.id} />}
      primaryText={subject}
      secondaryText={
        <p>
          <span style={styles.authorName}>{actor.name}</span> — {snippet}
        </p>
      }
      secondaryTextLines={2}
      containerElement={
        <Link
          to={{
            pathname: `/conversations/${encodeURIComponent(conversation.id)}`
          }}
        />
      }
    />
  )
}

// const ComponentWithData = apollo.graphql(q.localConversations, {
//   options: ({ account }: ActivityStreamProps) => ({
//     account,
//     variables: {
//       labels: ['\\Inbox'],
//       lang: navigator.language,
//       // Provide date but not time so that Apollo can cache results
//       since: Moment().subtract(30, 'days').toISOString().slice(0, 10)
//     }
//   })
// })(ActivityStream)

export default ActivityStream
