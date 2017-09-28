/* @flow */

import * as kefir from 'kefir'
import * as actions from './actions'
import { type Transporter } from './types'

export default function perform<T> (
  action: actions.Action<T>,
  smtpTransport: Transporter
): kefir.Observable<T, Error> {
  return _perform(action, smtpTransport)
}

function _perform (
  action: actions.Action<any>,
  smtpTransport: Transporter
): kefir.Observable<any, Error> {
  switch (action.type) {
    case actions.SEND:
      return kefir.fromPromise(
        smtpTransport.sendMail(action.message)
      )
    default:
      return kefir.constantError(
        new Error(`unknown request type: ${action.type}`)
      )
  }
}
