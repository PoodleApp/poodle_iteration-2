/* @flow */

import AppBar             from 'material-ui/AppBar'
import Divider            from 'material-ui/Divider'
import IconButton         from 'material-ui/IconButton'
import { List, ListItem } from 'material-ui/List'
import RaisedButton       from 'material-ui/RaisedButton'
import * as colors        from 'material-ui/styles/colors'
import spacing            from 'material-ui/styles/spacing'
import * as q             from 'poodle-core/lib/queries/localConversations'
import React              from 'react'
import * as apollo        from 'react-apollo'
import * as redux         from 'react-redux'
import { Link }           from 'react-router-dom'

import Avatar             from '../Avatar'
import ChannelListSidebar from './ChannelListSidebar'

import type { State } from '../../reducers'

type ActivityStreamProps = {
  data:         q.LocalConversations,
  dispatch:     (action: Object) => void,
}

const styles = {
  authorName: {
    color: colors.darkBlack,
  },
  body: {
    display: 'flex',
    flex: 1,
  },
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

export function ActivityStream(props: ActivityStreamProps) {
  const { conversations, error, loading } = props.data

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
  else {
    const convs = conversations.map(
      (conv, i) => <div key={conv.id}>
        <ConversationRow conversation={conv} />
        {i == conversations.length - 1 ? '' : <Divider inset={true} /> }
      </div>
    )
    content = <List>{convs}</List>
  }

  return <div style={styles.root}>
    <header>
      <AppBar
        title={<span style={styles.title}>Poodle</span>}
        iconElementRight={
          <IconButton iconClassName="material-icons">refresh</IconButton>
        }
        onRightIconButtonTouchTap={props.data.refetch}
      />
    </header>
    <div style={styles.body}>
      <main style={styles.content}>{content}</main>
      <nav style={styles.leftNav}>
        <ChannelListSidebar />
      </nav>
    </div>
  </div>
}

type ConversationRowProps = {
  conversation: q.Conversation,
}

function ConversationRow({ conversation }: ConversationRowProps) {
  const subject  = conversation.subject || '[no subject]'
  const activity = conversation.latestActivity
  const actor    = activity.actor
  const snippet  = activity.contentSnippet

  return <ListItem
    leftAvatar={<Avatar name={actor.name} id={actor.id} />}
    primaryText={subject}
    secondaryText={
      <p>
        <span style={styles.authorName}>{actor.name}</span> &mdash; {snippet}
      </p>
    }
    secondaryTextLines={2}
    containerElement={<Link to={{ pathname: `/conversations/${encodeURIComponent(conversation.id)}` }} />}
  />
}

const ComponentWithData = apollo.graphql(q.localConversations, {
  options: ({}: ActivityStreamProps) => ({
    variables:    { lang: navigator.language },
    pollInterval: 300000,
  })
})(ActivityStream)

// const ComponentWithDataAndState = redux.connect(mapStateToProps)(ComponentWithData)

// function mapStateToProps({ activityStream }: State): $Shape<ActivityStreamProps> {
//   return {
//     query: activityStream.query,
//   }
// }

// export default ComponentWithDataAndState
export default ComponentWithData
