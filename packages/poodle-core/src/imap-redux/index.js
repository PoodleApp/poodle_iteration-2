/* @flow */

import { type AccountMetadata } from 'poodle-service'
import * as accounts from 'poodle-service/lib/accounts'
import * as redux from 'redux'

export const ACCOUNT_LIST = 'ImapInterface/accountList'

type Action = { type: typeof ACCOUNT_LIST, accounts: AccountMetadata[] }

export function enhancer (client: accounts.AccountClient): redux.StoreEnhancer<any, any> {
  const accountsStream = client.runAccountAction(accounts.watchAccounts())
  return next => (reducer, initState, enhancer) => {
    const store = next(reducer, initState, enhancer)
    accountsStream.onValue(accounts => {
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
