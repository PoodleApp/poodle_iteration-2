/* @flow */

import RaisedButton from 'material-ui/RaisedButton'
import { search }   from 'poodle-core/lib/actions/activityStream'
import * as q       from 'poodle-core/lib/queries/localConversations'
import React        from 'react'
import * as apollo  from 'react-apollo'
import * as redux   from 'react-redux'

import type { State } from 'poodle-core/lib/reducers'

type ActivityStreamProps = {
  data:         q.LocalConversations,
  dispatch:     (action: Object) => void,
  pollInterval: number,
  query:        string,
}

export function ActivityStream(props: ActivityStreamProps) {
  let queryInput: HTMLInputElement
  const { conversations, error, loading } = props.data

  if (loading) {
    return <div>Loading...</div>
  }
  else if (error) {
    return <div>
      <p>{String(error)}</p>
      <RaisedButton label="Retry" onClick={props.data.refetch} />
    </div>
  }

  console.log('conversations', props)

  return <div>
    <form onSubmit={onSearch.bind(null, queryInput, props)}>
      <input type="text" ref={input => { queryInput = input }} defaultValue={props.query} />
      <input type="submit" value="search" />
    </form>
    {conversations.map(conv => <ActivityRow conversation={conv} />)}
  </div>

}

function onSearch(input: ?HTMLInputElement, props: ActivityStreamProps, event: Event) {
  event.preventDefault()
  if (input) {
    const query = input.value
    props.dispatch(search(query))
  }
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
    variables: { query },
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
