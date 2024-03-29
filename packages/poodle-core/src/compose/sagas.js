/* @flow */

// TODO: these sagas should probably be moved to `imap-redux`, or to top-level
// sagas

import * as compose from 'arfe/lib/compose'
import * as Addr from 'arfe/lib/models/Address'
import Message from 'arfe/lib/models/Message'
import { type MessagePart } from 'arfe/lib/models/MessagePart'
import { type URI } from 'arfe/lib/models/uri'
import * as cache from 'poodle-service/lib/cache'
import * as tasks from 'poodle-service/lib/tasks'
import * as router from 'react-router-redux'
import { type Saga } from 'redux-saga'
import {
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
import { callObservableProducer } from '../sagas/effects'
import * as composeActions from './actions'
import contentFromFile from './contentFromFile'

export interface Dependencies {
  perform: tasks.Perform
}

// Generator type parameters are of the form: `Generator<+Yield,+Return,-Next>`

function * sendEdit (
  deps: Dependencies,
  action: composeActions.Action
): Saga<void> {
  if (action.type !== composeActions.EDIT) {
    return
  }
  const {
    account,
    activity,
    conversation,
    draftId,
    recipients,
    content
  } = action
  const messageBuilder = compose.edit({
    ...recipients,
    content: {
      mediaType: content.mediaType,
      stream: stringToStream(content.string)
    },
    conversation,
    activity
  })
  yield * transmit(deps, draftId, account, messageBuilder)
}

function * sendReply (
  deps: Dependencies,
  action: composeActions.Action
): Saga<void> {
  if (action.type !== composeActions.REPLY) {
    return
  }
  const { account, conversation, draftId, recipients, content } = action
  const messageBuilder = compose.comment({
    ...recipients,
    content: {
      mediaType: content.mediaType,
      stream: stringToStream(content.string)
    },
    conversation
  })
  yield * transmit(deps, draftId, account, messageBuilder)
}

function * sendNewDiscussion (
  deps: Dependencies,
  action: composeActions.Action
): Saga<void> {
  if (action.type !== composeActions.NEW_DISCUSSION) {
    return
  }
  const {
    account,
    attachments,
    participants,
    content,
    draftId,
    subject
  } = action
  const messageBuilder = compose.discussion({
    ...participants,
    attachments: attachments ? attachments.map(contentFromFile) : [],
    content: {
      mediaType: content.mediaType,
      stream: stringToStream(content.string)
    },
    subject
  })
  const messageUri = yield * transmit(deps, draftId, account, messageBuilder)
  if (messageUri) {
    yield put(
      router.replace(`/conversations/${encodeURIComponent(messageUri)}`)
    )
  }
}

function * transmit (
  deps: Dependencies,
  draftId: string,
  account: Account,
  messageBuilder: compose.Builder<Message>
): Saga<?URI> {
  const sender = Addr.build(account)
  const { message, parts } = yield call(compose.build, messageBuilder, sender)
  try {
    yield put(composeActions.sending(draftId))

    // write copy of message and content to local cache
    const messageRecord = cache.messageToRecord(message)
    yield callObservableProducer(deps.perform,
      tasks.storeLocalCopyOfMessage,
      [messageRecord, parts],
      {
        accountName: account.email
      }
    )

    // recording local record consumes content streams, so read content back
    // from database to serialize message for transmission
    const serialized = yield callObservableProducer(deps.perform,
      tasks.serialize,
      [message],
      {
        accountName: account.email
      }
    )

    // transmit the message
    const result = yield callObservableProducer(deps.perform,
      tasks.sendMail,
      [serialized],
      {
        accountName: account.email
      }
    )
    console.log('DeliveryResult') // TODO: debugging output
    console.dir(result)
    yield put(composeActions.sent(draftId))
    return message.uri
  } catch (err) {
    yield put(chrome.showError(err))
  }
}

export default function * root (
  deps: Dependencies
): Saga<void> {
  yield all([
    fork(takeEvery, composeActions.EDIT, sendEdit, deps),
    fork(takeEvery, composeActions.REPLY, sendReply, deps),
    fork(takeEvery, composeActions.NEW_DISCUSSION, sendNewDiscussion, deps)
  ])
}
