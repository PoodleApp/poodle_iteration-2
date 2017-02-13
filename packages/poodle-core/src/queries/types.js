/* @flow */

import typeof { ApolloError }       from 'apollo-client'
import type   { ApolloQueryResult } from 'apollo-client'

export type ApolloData = {
  error:    ?ApolloError,
  loading:  boolean,

  // mixins from Apollo's `ObservableQuery` type:
  fetchMore:    Function,
  refetch:      (variables: any) => Promise<ApolloQueryResult>,
  stopPolling:  () => void,
  startPolling: (pollInterval: number) => void,
}

export type LanguageValue = { [key:string]: string }

export type URI = string
