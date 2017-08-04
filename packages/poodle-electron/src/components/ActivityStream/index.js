/* @flow */

import * as Actor from 'arfe/lib/models/Actor'
import Conversation from 'arfe/lib/models/Conversation'
import * as LV from 'arfe/lib/models/LanguageValue'
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
import * as q from 'poodle-core/lib/queries/conversations'
import { type Slurp, slurp } from 'poodle-core/lib/slurp'
import { observable } from 'poodle-core/lib/slurp/effects'
import Sync from 'poodle-service/lib/sync'
import React from 'react'
import { Link } from 'react-router-dom'

import Avatar from '../Avatar'
import ChannelListSidebar from './ChannelListSidebar'

import type { State } from '../../reducers'

type OwnProps = {
  account: authActions.Account
}

type Props = OwnProps & {
  conversations: Slurp<q.ConversationListItem[], mixed>
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

export function ActivityStream (props: Props) {
  const { value: conversations, error, latest, complete } = props.conversations

  let content
  if (error && latest === error) {
    content = (
      <div>
        <p>
          {String(error)}
        </p>
        <RaisedButton
          label='Retry'
          onClick={() => alert('TODO: implement retry action')}
        />
      </div>
    )
  } else if (!conversations) {
    content = <div>Loading...</div>
  } else {
    const convs = conversations.map((conv, i) =>
      <div key={conv.id}>
        <ConversationRow conversation={conv} />
        {i == conversations.length - 1 ? '' : <Divider inset={true} />}
      </div>
    )
    content = (
      <Paper>
        <List>
          {convs}
        </List>
      </Paper>
    )
  }

  return (
    <div style={styles.root}>
      <header>
        <AppBar
          title={<span style={styles.title}>Poodle</span>}
          iconElementRight={
            <IconButton iconClassName='material-icons'>refresh</IconButton>
          }
          onRightIconButtonTouchTap={() =>
            alert('TODO: implement refresh action')}
        />
      </header>
      <div style={styles.body}>
        <main style={styles.content}>
          {content}
        </main>
        <nav style={styles.leftNav}>
          <ChannelListSidebar />
        </nav>
      </div>
    </div>
  )
}

type ConversationRowProps = {
  conversation: q.ConversationListItem
}

function ConversationRow ({ conversation }: ConversationRowProps) {
  const activity = conversation.latestActivity
  const actor = activity.actor
  const actorDisplayName = Actor.displayName(actor)
  const actorEmail = actor ? Actor.email(actor) : ''
  const snippet = activity.contentSnippet || '[unable to fetch content snippet]'

  return (
    <ListItem
      leftAvatar={<Avatar actor={actor} />}
      primaryText={LV.getString(conversation.subject, '[no subject]')}
      secondaryText={
        <p>
          <span style={styles.authorName}>{actorDisplayName}</span> — {snippet}
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

const ActivityStreamWithData = slurp(({ auth }: State, { }: OwnProps) => ({
  conversations: observable(q.fetchConversations, auth.sync, {
    labels: ['\\Inbox'],
    limit: 30,
    since: Moment().subtract(30, 'days').toISOString().slice(0, 10)
  })
}))(ActivityStream)

export default ActivityStreamWithData
