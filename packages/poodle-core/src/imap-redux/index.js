/* @flow */

import { type AccountMetadata } from 'poodle-service'
import * as C from 'poodle-service/lib/ImapInterface/Client'
import * as redux from 'redux'

export const ACCOUNT_LIST = 'ImapInterface/accountList'

type Action = { type: typeof ACCOUNT_LIST, accounts: AccountMetadata[] }

export function enhancer (client: C.Client): redux.StoreEnhancer<any, any> {
  return next => (reducer, initState, enhancer) => {
    const store = next(reducer, initState, enhancer)
    C.accounts(client).onValue(accounts => {
      store.dispatch({ type: ACCOUNT_LIST, accounts })
    })
    return store
  }
}

export type State = { accounts?: AccountMetadata[] }
const initialState: State = {}

export function reducer (state: State = initialState, action: Action): State {
  switch (action.type) {
    case ACCOUNT_LIST:
      return {
        ...state,
        accounts: action.accounts
      }
    default:
      return state
  }
}
