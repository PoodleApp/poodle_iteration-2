/* @flow */

import type { Account, Action } from '../actions/auth'

export type State = {
  account?: Account
}

const initialState = {}

export default function reducer (
  state: State = initialState,
  action: Action
): State {
  switch (action.type) {
    case 'auth/setAccount':
      return {
        ...state,
        account: action.account
      }
    default:
      return state
  }
}
