/* @flow */

import Conversation from 'arfe/lib/models/Conversation'
import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import { FlatButton, IconButton, IconMenu, Paper, TextField } from 'material-ui'
import MenuItem from 'material-ui/MenuItem'
import MoreVertIcon from 'material-ui/svg-icons/navigation/more-vert'
import spacing from 'material-ui/styles/spacing'
import * as auth from 'poodle-core/lib/actions/auth'
import * as chrome from 'poodle-core/lib/actions/chrome'
import * as compose from 'poodle-core/lib/compose'
import PropTypes from 'prop-types'
import provideContent, { type ContentProps } from './provideContent'
import * as React from 'react'
import { type ConnectedComponentClass } from 'react-redux'

type OwnProps = {
  account: auth.Account,
  activity: DerivedActivity,
  conversation: Conversation,
  draftId: compose.ID,
  hintText?: string,
  showAddPeople?: boolean
}

type Props = OwnProps & compose.Props & { initialContent: compose.Content }

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

export function EditNote (props: Props) {
  const recipients = props.conversation.replyRecipients(props.account)
  const content = props.content || props.initialContent

  function onEdit (event) {
    event.preventDefault()
    props.onEdit(props.activity, props.conversation, recipients, content)
  }

  return (
    <div style={styles.activityCard}>
      <Paper>
        <ComposeOptsMenu
          style={styles.menu}
          showAddPeople={props.showAddPeople}
        />
        <form style={styles.body} onSubmit={onEdit}>
          {props.showAddPeople ? <div>TODO: UI to edit recipients</div> : ''}

          <TextField
            hintText={props.hintText || 'Edit your message'}
            multiLine={true}
            fullWidth={true}
            name='body'
            onChange={event =>
              props.onContentChange({
                mediaType: 'text/html',
                string: event.currentTarget.value
              })}
            value={content.string}
          />
          <br />

          <FlatButton
            label='Save Changes'
            disabled={props.sending}
            onTouchTap={onEdit}
          />

          <FlatButton
            label='Cancel'
            disabled={props.sending}
            onTouchTap={event => {
              props.onDiscard()
              props.dispatch(chrome.stopEditing(props.activity.id))
            }}
          />
        </form>
      </Paper>
    </div>
  )
}

type ComposeOptsMenuProps = {
  showAddPeople?: boolean
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

export const EditNoteWithState: ConnectedComponentClass<
  OwnProps & { initialContent: compose.Content },
  Props & OwnProps & { initialContent: compose.Content }
> = compose.ComposeHOC(EditNote)

const EditNoteWithStateAndInitialContent: React.ComponentType<
  OwnProps
> = provideContent(function GetInitialContent (props: OwnProps & ContentProps) {
  const { content } = props
  if (content.value) {
    return (
      <EditNoteWithState
        {...props}
        initialContent={{
          string: content.value.content,
          mediaType: content.value.mediaType
        }}
        mediaType={content.value.mediaType}
      />
    )
  } else {
    return <span>Loading...</span>
  }
})

export default EditNoteWithStateAndInitialContent
