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
import * as m from 'mori'
import * as authActions from 'poodle-core/lib/actions/auth'
import * as chrome from 'poodle-core/lib/actions/chrome'
import { type Slurp } from 'poodle-core/lib/slurp'
import { type ConversationListItem } from 'poodle-service/lib/tasks'
import * as React from 'react'
import { Link } from 'react-router-dom'
import { type Dispatch } from 'redux'

import Avatar from '../Avatar'
import ComposeButton from '../ComposeButton'
import Errors from '../Errors'
import SearchBar from '../SearchBar'
import ChannelListSidebar from './ChannelListSidebar'

type _Void<Args: *, F: (...args: Args) => any> = (...args: Args) => void
type Void<F> = _Void<*, F>

export type Props = {
  account: authActions.Account,
  conversations: Slurp<ConversationListItem[], Error>,
  errors: ?(Error[]),
  onDismissError: Void<typeof chrome.dismissError>,
  onSearch: Void<typeof chrome.search>,
  searchQuery: ?string
}

const styles = {
  authorName: {
    // color: colors.darkBlack
  },
  body: {
    display: 'flex',
    flex: 1
  },
  content: {
    flex: 1,
    padding: spacing.desktopGutter + 'px'
  },
  date: {
    color: colors.darkBlack
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

export default function ActivityStream (props: Props) {
  const { value: conversations, error, latest, complete } = props.conversations

  const errorDisplay = error
    ? <p>
        {String(error)}
      </p>
    : ''

  let content
  if (error && latest === error) {
    content = (
      <div>
        {errorDisplay}
        <RaisedButton label='Retry' onClick={props.conversations.reload} />
      </div>
    )
  } else if (conversations && conversations.length > 1) {
    const sorted = m.intoArray(
      m.sortBy(conv => 0 - conv.lastActiveTime, conversations)
    )
    const convs = sorted.map((conv, i) =>
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
  } else if (!complete) {
    content = <div>Loading...</div>
  } else {
    content = <div>No results</div>
  }

  return (
    <div style={styles.root}>
      <header>
        <AppBar
          title={<span style={styles.title}>Poodle</span>}
          iconElementRight={
            <IconButton
              iconClassName='material-icons'
              onClick={props.conversations.reload}
            >
              refresh
            </IconButton>
          }
        />
      </header>
      <div style={styles.body}>
        <main style={styles.content}>
          <SearchBar
            onSearch={props.onSearch}
            value={props.searchQuery || ''}
          />
          {content}
        </main>
        <nav style={styles.leftNav}>
          <ChannelListSidebar />
        </nav>
      </div>
      <ComposeButton account={props.account} />
      <Errors errors={props.errors} onDismiss={props.onDismissError} />
    </div>
  )
}

type ConversationRowProps = {
  conversation: ConversationListItem
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
          <span style={styles.date}>
            {Moment(conversation.lastActiveTime).calendar()}
          </span>
          {'\u00A0\u00A0'}
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
