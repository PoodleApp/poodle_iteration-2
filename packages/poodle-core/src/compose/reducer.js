/* @flow */

import { type Participants } from 'arfe/lib/models/Conversation'
import * as m from 'mori'
import * as compose from './actions'
import { type Action, type Content } from './actions'

type ID = string

type DraftState = {
  content: ?Content,
  recipients: ?Participants,
  sending: boolean,
  subject: ?string
}

export type State = {
  drafts: m.Map<ID, DraftState>
}

export const initialState = {
  drafts: m.hashMap()
}

export const initialDraftState = Object.freeze({
  content: null,
  recipients: null,
  sending: false,
  subject: null
})

export default function reducer (
  state: State = initialState,
  action: Action
): State {
  switch (action.type) {
    case compose.DISCARD:
      return {
        ...state,
        drafts: m.dissoc(state.drafts, action.draftId)
      }
    case compose.SENDING:
      return updateDraftState(state, action.draftId, draft => ({
        ...draft,
        sending: true
      }))
    case compose.SENT:
      return {
        ...state,
        drafts: m.dissoc(state.drafts, action.draftId)
      }
    case compose.SET_CONTENT:
      const content = action.content
      return updateDraftState(state, action.draftId, draft => ({
        ...draft,
        content
      }))
    case compose.SET_RECIPIENTS:
      const recipients = action.recipients
      return updateDraftState(state, action.draftId, draft => ({
        ...draft,
        recipients
      }))
    case compose.SET_SUBJECT:
      const subject = action.subject
      return updateDraftState(state, action.draftId, draft => ({
        ...draft,
        subject
      }))
    default:
      return state
  }
}

function updateDraftState (
  state: State,
  draftId: ID,
  fn: DraftState => DraftState
): State {
  const orig = m.get(state.drafts, draftId) || initialDraftState
  const updated = fn(orig)
  return {
    ...state,
    drafts: m.assoc(state.drafts, draftId, updated)
  }
}

function withDraftState<T> (state: State, draftId: ID, fn: DraftState => T): ?T {
  const draft = m.get(state.drafts, draftId, null)
  if (draft) {
    return fn(draft)
  }
}

export function getContent (state: State, draftId: ID): ?Content {
  return withDraftState(state, draftId, draft => draft.content)
}

export function getRecipients (state: State, draftId: ID): ?Participants {
  return withDraftState(state, draftId, draft => draft.recipients)
}

export function getSubject (state: State, draftId: ID): ?string {
  return withDraftState(state, draftId, draft => draft.subject)
}

export function isSending (state: State, draftId: ID): boolean {
  const result = withDraftState(state, draftId, draft => draft.sending)
  return typeof result === 'boolean' ? result : false
}
