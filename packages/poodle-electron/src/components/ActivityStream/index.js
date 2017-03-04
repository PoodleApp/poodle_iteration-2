/* @flow */

import AppBar       from 'material-ui/AppBar'
import RaisedButton from 'material-ui/RaisedButton'
import spacing      from 'material-ui/styles/spacing'
import * as q       from 'poodle-core/lib/queries/localConversations'
import React        from 'react'
import * as apollo  from 'react-apollo'
import * as redux   from 'react-redux'

import ChannelListSidebar from './ChannelListSidebar'

import type { State } from 'poodle-core/lib/reducers'

type ActivityStreamProps = {
  data:         q.LocalConversations,
  dispatch:     (action: Object) => void,
  pollInterval: number,
  query:        string,
}

const styles = {
  body: {
    display: 'flex',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.desktopGutter + 'px',
  },
  leftNav: {
    flex: '0 0 12em',
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
  let queryInput: HTMLInputElement
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
    content = conversations.map(
      conv => <ActivityRow key={conv.id} conversation={conv} />
    )
  }

  return <div style={styles.root}>
    <header>
      <AppBar
        title={<span style={styles.title}>Poodle</span>}
        iconClassNameRight="muidocs-icon-navigation-refresh"
        onRightIconButtonTouchTap={props.data.refetch}
      />
    </header>
    <div style={styles.body}>
      <main style={styles.main}>{content}</main>
      <nav style={styles.leftNav}>
        <ChannelListSidebar />
      </nav>
    </div>
  </div>
}

type ActivityRowProps = {
  conversation: q.Conversation,
}

function ActivityRow({ conversation }: ActivityRowProps) {
  const subject = conversation.subject.get || '[no subject]'
  const ppl = conversation.participants.map(p => p.displayName).join(', ')

  return <div>
    {subject} ({ppl})
    <hr/>
  </div>
}

const ComponentWithData = apollo.graphql(q.localConversations, {
  options: ({ query, pollInterval }: ActivityStreamProps) => ({
    variables: { lang: navigator.language },
    pollInterval,
  })
})(ActivityStream)

const ComponentWithDataAndState = redux.connect(mapStateToProps)(ComponentWithData)

function mapStateToProps({ activityStream }: State): $Shape<ActivityStreamProps> {
  return {
    query: activityStream.query,
  }
}

export default ComponentWithDataAndState
