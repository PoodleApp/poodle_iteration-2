/* @flow */

import Conversation, { type Participants } from 'arfe/lib/models/Conversation'
import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import { type Account } from '../actions/auth'

export const DISCARD = 'compose/discard'
export const EDIT = 'compose/edit'
export const REPLY = 'compose/reply'
export const NEW_DISCUSSION = 'compose/newDiscussion'
export const SENDING = 'compose/sending'
export const SENT = 'compose/sent'
export const SET_CONTENT = 'compose/setContent'
export const SET_RECIPIENTS = 'compose/setRecipients'
export const SET_SUBJECT = 'compose/setSubject'
export const ADD_ATTACHMENTS = 'compose/addAttachments'
export const REMOVE_ATTACHMENT = 'compose/removeAttachment'

export type Recipients = {
  to?: string,
  cc?: string,
  bcc?: string
}

export type Action =
  | {
      type: typeof DISCARD,
      draftId: ID
    }
  | {
      type: typeof EDIT,
      account: Account,
      activity: DerivedActivity,
      conversation: Conversation,
      draftId: ID,
      recipients: Participants,
      content: Content
    }
  | {
      type: typeof REPLY,
      account: Account,
      conversation: Conversation,
      draftId: ID,
      recipients: Participants,
      content: Content
    }
  | {
      type: typeof NEW_DISCUSSION,
      account: Account,
      draftId: ID,
      attachments: ?(File[]),
      participants: Participants,
      content: Content,
      subject: ?string
    }
  | {
      type: typeof SENDING,
      draftId: ID
    }
  | {
      type: typeof SENT,
      draftId: ID
    }
  | {
      type: typeof SET_CONTENT,
      content: Content,
      draftId: ID
    }
  | {
      type: typeof SET_RECIPIENTS,
      draftId: ID,
      recipients: Recipients
    }
  | {
      type: typeof SET_SUBJECT,
      draftId: ID,
      subject: string
    }
  | {
      type: typeof ADD_ATTACHMENTS,
      draftId: ID,
      attachments: File[]
    }
  | {
      type: typeof REMOVE_ATTACHMENT,
      draftId: ID,
      attachment: File
    }

export type Content = {
  mediaType: string,
  string: string
}

type ID = string

export function discard (draftId: ID): Action {
  return { type: DISCARD, draftId }
}

export function edit (
  draftId: ID,
  account: Account,
  activity: DerivedActivity,
  conversation: Conversation,
  recipients: Participants,
  content: Content
): Action {
  return {
    type: EDIT,
    account,
    activity,
    conversation,
    draftId,
    recipients,
    content
  }
}

export function reply (
  draftId: ID,
  account: Account,
  conversation: Conversation,
  recipients: Participants,
  content: Content
): Action {
  return { type: REPLY, account, conversation, draftId, recipients, content }
}

export function newDiscussion (
  draftId: ID,
  account: Account,
  opts: {
    attachments: ?(File[]),
    participants: Participants,
    content: Content,
    subject: ?string
  }
): Action {
  return {
    type: NEW_DISCUSSION,
    account,
    draftId,
    attachments: opts.attachments,
    participants: opts.participants,
    content: opts.content,
    subject: opts.subject
  }
}

export function sending (draftId: ID): Action {
  return { type: SENDING, draftId }
}

export function sent (draftId: ID): Action {
  return { type: SENT, draftId }
}

export function setContent (draftId: ID, content: Content): Action {
  return { type: SET_CONTENT, content, draftId }
}

export function setRecipients (draftId: ID, recipients: Recipients): Action {
  return { type: SET_RECIPIENTS, draftId, recipients }
}

export function setSubject (draftId: ID, subject: string): Action {
  return { type: SET_SUBJECT, draftId, subject }
}

export function addAttachments (draftId: ID, attachments: File[]): Action {
  return { type: ADD_ATTACHMENTS, draftId, attachments }
}

export function removeAttachment (draftId: ID, attachment: File): Action {
  return { type: REMOVE_ATTACHMENT, draftId, attachment }
}
