/* @flow */

import Conversation from 'arfe/lib/models/Conversation'
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
import PropTypes from 'prop-types'
import React from 'react'
import * as auth from 'poodle-core/lib/actions/auth'

type Props = {
  account: auth.Account,
  conversation: Conversation,
  loading: boolean,
  send: (conversation: Conversation, content: string) => void,
  showAddPeople: boolean,
  toggleShowAddPeople: (on: boolean) => void
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

export default function ComposeReply (props: Props) {
  let bodyInput: ?HTMLInputElement

  function onSend (event) {
    event.preventDefault()
    if (bodyInput) {
      props.send(props.conversation, bodyInput.value)
    }
  }

  return (
    <div style={styles.activityCard}>
      <Paper>
        <ComposeOptsMenu
          style={styles.menu}
          showAddPeople={props.showAddPeople}
          toggleShowAddPeople={props.toggleShowAddPeople}
        />
        <form style={styles.body} onSubmit={onSend}>
          {props.showAddPeople ? <div>TODO</div> : ''}

          <TextField
            hintText={props.hintText || 'Compose reply'}
            multiLine={true}
            fullWidth={true}
            name='body'
            ref={input => {
              bodyInput = input
            }}
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
  showAddPeople: boolean,
  toggleShowAddPeople: (on: boolean) => void
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
    props.toggleShowAddPeople(!props.showAddPeople)
  }
}
