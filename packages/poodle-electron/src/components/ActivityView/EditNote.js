/* @flow */

import type { Activity, Conversation } from 'poodle-core/lib/queries/localConversation'

const styles = {
  body: {
    padding: '16px',
    marginRight: '48px',
  },
  menu: {
    float: 'right',
  },
}

type EditNoteProps = {
  activity:     Activity,
  conversation: Conversation,
}

// TODO
export default function EditNote(props: EditNoteProps) {
  return <p>TODO</p>
}

function textContent({ content }: Activity): ?string {
  if (content && content.mediaType.startsWith('text/')) {
    return content.asString
  }
}
