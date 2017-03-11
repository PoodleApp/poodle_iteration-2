/* @flow */

import AppBar       from 'material-ui/AppBar'
import Divider      from 'material-ui/Divider'
import IconButton   from 'material-ui/IconButton'
import RaisedButton from 'material-ui/RaisedButton'
import * as colors  from 'material-ui/styles/colors'
import spacing      from 'material-ui/styles/spacing'
import * as q       from 'poodle-core/lib/queries/localConversation'
import * as apollo  from 'react-apollo'
import React        from 'react'
import * as redux   from 'react-redux'

import ActivityView from '../ActivityView'

import type { Match } from 'react-router-dom'
import type { State } from '../../reducers'

type ConversationProps = {
  data:      q.LocalConversation,
  dispatch:  Dispatch<any>,
  editing:   ?ActivityId,
  loading:   boolean,
  match:     Match,
  username:  string,
  useremail: string,
}

type ActivityId = string

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

export function Conversation(props: ConversationProps) {
  const { conversations, error, loading } = props.data
  const conversation = conversations && conversations[0]

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
      <p>Conversation not found</p>
      <RaisedButton label="Retry" onClick={props.data.refetch} />
    </div>
  }
  else {
    const activities = conversation.activities.map(
      act => <ActivityView key={act.id} activity={act} conversation={conversation} {...props} />
    )
    content = <div>{activities}</div>
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
    </div>
  </div>
}

const ComponentWithData = apollo.graphql(q.localConversation, {
  options: ({ match }: ConversationProps) => ({
    variables: {
      id:   match.params.conversationId,
      lang: navigator.language,
    },
    pollInterval: 300000,
  })
})(Conversation)

function mapStateToProps({ auth }: State): $Shape<ConversationProps> {
  const account = auth.account
  return {
    editing:   null,   // TODO
    loading:   false,  // TODO
    useremail: account ? account.email : '',
    username:  account ? account.email : '',  // TODO
  }
}

export default redux.connect(mapStateToProps)(ComponentWithData)
