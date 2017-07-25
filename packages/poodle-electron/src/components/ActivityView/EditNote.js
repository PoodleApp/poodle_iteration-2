/* @flow */

import Conversation from 'arfe/lib/models/Conversation'
import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import * as q from 'poodle-core/lib/queries/conversation'

const styles = {
  body: {
    padding: '16px',
    marginRight: '48px'
  },
  menu: {
    float: 'right'
  }
}

type EditNoteProps = {
  activity: DerivedActivity,
  conversation: Conversation
}

// TODO
export default function EditNote (props: EditNoteProps) {
  return <p>TODO</p>
}
