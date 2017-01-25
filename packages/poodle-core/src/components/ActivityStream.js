/* @flow */

import * as Conv    from 'arfe/conversation'
import * as Act     from 'arfe/derivedActivity'
import * as Thrd    from 'arfe/models/thread'
import gql          from 'graphql-tag'
import RaisedButton from 'material-ui/RaisedButton'
import React        from 'react'
import * as apollo  from 'react-apollo'
import * as redux   from 'react-redux'
import { search }   from '../actions/activityStream'

import typeof { ApolloError }       from 'apollo-client'
import type   { ApolloQueryResult } from 'apollo-client'
import type   { Message }           from 'graphql-imap/lib/models/Message'
import type   { State }             from '../reducers'

type ActivityStreamProps = {
  data: {
    error:    ?ApolloError,
    loading:  boolean,
    allMail: {
      threads: {
        messages: ?Message[],
      }[],
    },

    // mixins from Apollo's `ObservableQuery` type:
    fetchMore:    Function,
    refetch:      (variables: any) => Promise<ApolloQueryResult>,
    stopPolling:  () => void,
    startPolling: (pollInterval: number) => void,
  },
  dispatch:     (action: Object) => void,
  pollInterval: number,
  query:        string,
}

export function ActivityStream(props: ActivityStreamProps): React.Element<*> {
  let queryInput: HTMLInputElement
  const { allMail, error, loading } = props.data

  if (loading) {
    return <div>Loading...</div>
  }
  else if (error) {
    return <div>
      <p>{String(error)}</p>
      <RaisedButton label="Retry" onClick={props.data.refetch} />
    </div>
  }

  const activities = allMail.threads.map(({ messages }) => {
    const thread = Thrd.buildThread(messages)
    const conversation = Conv.threadToConversation(thread)
    return <ActivityRow activity={Conv.getLatestActivity(conversation)} />
  })

  return <div>
    <form onSubmit={onSearch.bind(null, queryInput, props)}>
      <input type="text" ref={input => { queryInput = input }} defaultValue={props.query} />
      <input type="submit" value="search" />
    </form>
    {activities}
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
  activity: Act.DerivedActivity,
}

function ActivityRow({ activity }: ActivityRowProps): React.Element<*> {
  const title = Act.getTitle(activity)
  const types = Act.getTypes(activity)

  return <div>
    {title ? title.get() : '[no title]'} ({types.join(' ')})
    <hr/>
  </div>
}

const SearchThreads = gql`query SearchThreads($query: String!) {
  allMail: box(attribute: "\\\\All") {
    threads(search: $query) {
      id
      messages {
        flags
        date
        envelope {
          messageId
          subject
          from { name }
          to { name }
        }
      }
    }
  }
}`

const ComponentWithData = apollo.graphql(SearchThreads, {
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
