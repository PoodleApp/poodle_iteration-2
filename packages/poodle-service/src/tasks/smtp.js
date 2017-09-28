/* @flow */

import * as smtp from '../smtp'
import * as actions from '../smtp/actions'
import Task from './Task'

export function sendMail (message: smtp.MessageOptions): Task<void> {
  return smtpTask(actions.send(message))
}

function smtpTask<T> (action: smtp.Action<T>): Task<T> {
  return new Task((context, state) =>
    context.runSmtpAction(action, state).map(value => ({ value, state }))
  )
}
