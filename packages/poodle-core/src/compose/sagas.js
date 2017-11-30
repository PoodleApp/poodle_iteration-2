/* @flow */

// TODO: these sagas should probably be moved to `imap-redux`, or to top-level
// sagas

import * as compose from 'arfe/lib/compose'
import * as Addr from 'arfe/lib/models/Address'
import Message from 'arfe/lib/models/Message'
import { type MessagePart } from 'arfe/lib/models/MessagePart'
import * as cache from 'poodle-service/lib/cache'
import * as C from 'poodle-service/lib/ImapInterface/Client'
import * as tasks from 'poodle-service/lib/tasks'
import {
  type Effect,
  all,
  call,
  fork,
  put,
  takeEvery
} from 'redux-saga/effects'
import { type Readable } from 'stream'
import stringToStream from 'string-to-stream'
import { type Account } from '../actions/auth'
import * as chrome from '../actions/chrome'
import * as composeActions from './actions'

export interface Dependencies {
  imapClient: C.Client
}

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

function * sendEdit (
  deps: Dependencies,
  action: composeActions.Action
): Generator<Effect, void, any> {
  if (action.type !== composeActions.EDIT) {
    return
  }
  const { account, activity, conversation, recipients, content } = action
  const message = compose.edit({
    ...recipients,
    content: {
      mediaType: content.mediaType,
      stream: stringToStream(content.string)
    },
    conversation,
    activity
  })
  // TODO: update `compose.edit` to return a `compose.Builder` value
  // yield * transmit(deps, account, message)
}

function * sendReply (
  deps: Dependencies,
  action: composeActions.Action
): Generator<Effect, void, any> {
  if (action.type !== composeActions.SEND) {
    return
  }
  const { account, conversation, recipients, content } = action
  const sender = Addr.build(account)
  const messageBuilder = compose.comment({
    ...recipients,
    content: {
      mediaType: content.mediaType,
      stream: stringToStream(content.string)
    },
    conversation
  })
  const messageWithContent = yield compose.build(messageBuilder, sender)
  yield * transmit(deps, account, messageWithContent)
}

function * transmit (
  deps: Dependencies,
  account: Account,
  { message, parts }: { message: Message, parts: { part: MessagePart, content: Readable }[] }
): Generator<Effect, void, any> {
  try {
    yield put(composeActions.sending())

    // write copy of message and content to local cache
    const messageRecord = cache.messageToRecord(message)
    yield C.perform(deps.imapClient, tasks.storeLocalCopyOfMessage, [messageRecord, parts], {
      accountName: account.email
    }).toPromise()

    // recording local record consumes content streams, so read content back
    // from database to serialize message for transmission
    const serialized = yield C.perform(deps.imapClient, tasks.serialize, [message], {
      accountName: account.email
    }).toPromise()

    // transmit the message
    const result = yield C.perform(deps.imapClient, tasks.sendMail, [serialized], {
      accountName: account.email
    }).toPromise()
    console.log('DeliveryResult') // TODO: debugging output
    console.dir(result)
    yield put(composeActions.sent())
  } catch (err) {
    yield put(chrome.showError(err))
  }
}

export default function * root (
  deps: Dependencies
): Generator<Effect, void, any> {
  yield all([
    fork(takeEvery, composeActions.EDIT, sendEdit, deps),
    fork(takeEvery, composeActions.SEND, sendReply, deps)
  ])
}
