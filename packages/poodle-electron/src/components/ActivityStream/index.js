/* @flow */

import AppBar      from 'material-ui/AppBar'
import spacing     from 'material-ui/styles/spacing'
import { search }  from 'poodle-core/lib/actions/activityStream'
import * as q      from 'poodle-core/lib/queries/localConversations'
import React       from 'react'
import * as apollo from 'react-apollo'
import * as redux  from 'react-redux'

import ChannelListSidebar from './ChannelListSidebar'

import type { State } from 'poodle-core/lib/reducers'

type ActivityStreamProps = {
  data:         q.LocalConversations,
  dispatch:     (action: Object) => void,
  pollInterval: number,
  query:        string,
}

const styles = {
  body: {
    padding: '16px',
    paddingTop: 0,
    whiteSpace: 'pre-wrap',
  },
  content: {
    boxSizing: 'border-box',
    padding: spacing.desktopGutter + 'px',
    // maxWidth: (spacing.desktopKeylineIncrement * 14) + 'px',
    minHeight: '800px',
  },
  root: {
    paddingTop: spacing.desktopKeylineIncrement + 'px',
    paddingBottom: '25em',
    position: 'relative',
  },
  title: {
    cursor: 'pointer',
  },
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

  return <div>
      <AppBar
        title={<span style={styles.title}>Poodle</span>}
      />

    <ChannelListSidebar />
    <div style={{paddingTop: 64, minHeight: 400, paddingLeft: 256}}>

      {conversations.map(conv => <ActivityRow key={conv.id} conversation={conv} />)}
    </div>

    <form onSubmit={onSearch.bind(null, queryInput, props)}>
      <input type="text" ref={input => { queryInput = input }} defaultValue={props.query} />
      <input type="submit" value="search" />
      <RaisedButton label="Refresh" onClick={props.data.refetch} />
    </form>
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
    variables: { lang: navigator.language },
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
