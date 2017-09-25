/* @flow */

import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import * as q from 'poodle-core/lib/queries/conversation'
import { type Slurp, slurp, subscribe } from 'poodle-core/lib/slurp'
import * as tasks from 'poodle-service/lib/tasks'
import * as React from 'react'
import { perform } from '../../imapClient'
import { type State } from '../../reducers'

type ExpectedProps = {
  activity: DerivedActivity
}

export type ContentProps = {
  content: Slurp<?q.Content, Error>
}

export default slurp(({ auth }: State, { activity }: ExpectedProps) => {
  const email = auth.account && auth.account.email
  const content = email
    ? perform(tasks.getActivityContent, [activity], { accountName: email })
    : perform(tasks.Task.error, [new Error('Cannot fetch content, not logged in')])
  return { content }
})
