/* @flow */

import Conversation, { type Participants } from 'arfe/lib/models/Conversation'
import marked from 'marked'
import {
  FlatButton,
  IconButton,
  IconMenu,
  Paper,
  Styles,
  TextField
} from 'material-ui'
import MenuItem from 'material-ui/MenuItem'
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert'
import spacing from 'material-ui/styles/spacing'
import * as m from 'mori'
import PropTypes from 'prop-types'
import React from 'react'
import * as auth from 'poodle-core/lib/actions/auth'
import { ComposeHOC } from 'poodle-core/lib/compose'
import * as compose from 'poodle-core/lib/compose/actions'
import { type State } from '../reducers'

type OwnProps = {
  account: auth.Account,
  conversation: Conversation,
  hintText?: string
}

type Props = OwnProps & {
  content: string,
  loading: boolean,
  onContentChange: typeof compose.setContent,
  onSend: typeof compose.send,
  showAddPeople: boolean
}

const styles = {
  activityCard: {
    paddingBottom: `${spacing.desktopGutterLess * 1}px`
  },
  body: {
    padding: `${spacing.desktopKeylineIncrement * 1}px`,
    paddingTop: 0
  },
  menu: {
    float: 'right'
  }
}

export function ComposeReply (props: Props) {
  const recipients = props.conversation.replyRecipients(props.account)

  function onSend (event) {
    event.preventDefault()
    props.onSend(props.account, props.conversation, recipients, {
      mediaType: 'text/html',
      string: marked(props.content)
    })
  }

  return (
    <div style={styles.activityCard}>
      <Paper>
        <ComposeOptsMenu
          style={styles.menu}
          showAddPeople={props.showAddPeople}
        />
        <form style={styles.body} onSubmit={onSend}>
          {props.showAddPeople ? <div>TODO</div> : ''}

          <TextField
            hintText={props.hintText || 'Compose reply'}
            multiLine={true}
            fullWidth={true}
            name='body'
            onChange={event => props.onContentChange(event.target.value)}
            value={props.content}
          />
          <br />

          <FlatButton
            label='Reply'
            disabled={props.loading}
            onTouchTap={onSend}
          />
        </form>
      </Paper>
    </div>
  )
}

type ComposeOptsMenuProps = {
  showAddPeople: boolean
}

function ComposeOptsMenu (props: ComposeOptsMenuProps, context) {
  const { palette } = context.muiTheme.baseTheme
  return (
    <IconMenu
      iconButtonElement={
        <IconButton>
          <MoreVertIcon color={palette.secondaryTextColor} />
        </IconButton>
      }
      onItemTouchTap={onMenuAction.bind(null, props)}
      {...props}
    >
      <MenuItem
        value='addPeople'
        primaryText='Add people'
        checked={props.showAddPeople}
        style={{ boxSizing: 'content-box' }}
      />
    </IconMenu>
  )
}

ComposeOptsMenu.contextTypes = {
  muiTheme: PropTypes.object.isRequired
}

function onMenuAction (
  props: ComposeOptsMenuProps,
  event,
  item: React.Element<*>
) {
  if (item.props.value === 'addPeople') {
    alert('TODO: implement recipient list editing')
  }
}

export default ComposeHOC(ComposeReply)
