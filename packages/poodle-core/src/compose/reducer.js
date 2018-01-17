/* @flow */

import * as m from 'mori'
import * as compose from './actions'
import { type Action } from './actions'

type ID = string

export type State = {
  content: m.Map<ID, string>,
  sending: m.Set<ID>
}

export const initialState = {
  content: m.hashMap(),
  sending: m.set()
}

export default function reducer (
  state: State = initialState,
  action: Action
): State {
  switch (action.type) {
    case compose.DISCARD:
      return {
        ...state,
        content: m.dissoc(state.content, action.draftId),
        sending: m.disj(state.sending, action.draftId)
      }
    case compose.SENDING:
      return {
        ...state,
        sending: m.conj(state.sending, action.draftId)
      }
    case compose.SENT:
      return {
        ...state,
        content: m.dissoc(state.content, action.draftId),
        sending: m.disj(state.sending, action.draftId)
      }
    case compose.SET_CONTENT:
      return {
        ...state,
        content: m.assoc(state.content, action.draftId, action.content)
      }
    default:
      return state
  }
}

export function getContent (state: State, draftId: ID): ?string {
  return m.get(state.content, draftId, null)
}

export function isSending (state: State, draftId: ID): boolean {
  return m.hasKey(state.sending, draftId)
}
