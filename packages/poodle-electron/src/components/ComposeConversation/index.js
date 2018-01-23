/* @flow */

import * as authActions from 'poodle-core/lib/actions/auth'
import * as compose from 'poodle-core/lib/compose'
import AppBar from 'material-ui/AppBar'
import FlatButton from 'material-ui/FlatButton'
import IconButton from 'material-ui/IconButton'
import TextField from 'material-ui/TextField'
import spacing from 'material-ui/styles/spacing'
import * as m from 'mori'
import * as React from 'react'
import * as router from 'react-router-redux'

const styles = {
  body: {
    display: 'flex',
    flex: 1
  },
  content: {
    flex: 1,
    padding: spacing.desktopGutter + 'px'
  },
  root: {
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column'
  }
}

export function ComposeConversation (props: compose.Props) {
  return (
    <div style={styles.root}>
      <header>
        <AppBar
          title='New Discussion'
          iconElementLeft={
            <IconButton iconClassName='material-icons'>arrow_back</IconButton>
          }
          onLeftIconButtonTouchTap={() => props.dispatch(router.goBack())}
        />
      </header>
      <div style={styles.body}>
        <main style={styles.content}>
          <Composer {...props} />
        </main>
      </div>
    </div>
  )
}

function Composer (props: compose.Props) {
  const { content } = props
  // const recipients = props.recipients || { to:  }
  // TODO: ^^

  return (
    <form style={styles.body} onSubmit={onNewDiscussion}>
      <TextField
        hintText={'To:'}
        multiLine={false}
        fullWidth={true}
        name='recipients'
        onChange={event => {
          recipients = event.currentTarget.value
        }}
      />
      <br />

      <TextField
        hintText={'Write your message here'}
        multiLine={true}
        fullWidth={true}
        name='body'
        onChange={event =>
          props.onContentChange({
            mediaType: 'text/html',
            string: event.currentTarget.value
          })}
        value={content}
      />
      <br />

      <FlatButton
        label='Send'
        disabled={props.sending}
        onClick={onNewDiscussion}
      />
    </form>
  )
}

const ComposeConversationWithState = compose.ComposeHOC(ComposeConversation)

export default ComposeConversationWithState
