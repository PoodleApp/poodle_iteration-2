/* @flow */

export type Action =
  | { type: 'auth/setAccount', account: Account }

export type Account = {
  email: string,
  name?: string
}

export function setAccount (account: Account): Action {
  return {
    type: 'auth/setAccount',
    account
  }
}
