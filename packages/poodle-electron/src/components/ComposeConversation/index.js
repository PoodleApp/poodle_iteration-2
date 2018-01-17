/* @flow */

type Props = {
  draftId: ?string
}

export default function ComposeConversation (props: Props) {
  if (props.draftId) {
    return <div>draftId: {props.draftId}</div>
  } else {
    return <div>waiting for draftId...</div>
  }
}
