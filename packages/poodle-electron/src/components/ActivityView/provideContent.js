/* @flow */

import DerivedActivity from 'arfe/lib/models/DerivedActivity'
import * as q from 'poodle-core/lib/queries/conversation'
import { type Slurp, slurp, subscribe } from 'poodle-core/lib/slurp'
import * as React from 'react'
import { type State } from '../../reducers'

type ExpectedProps = {
  activity: DerivedActivity
}

export type ContentProps = {
  content: Slurp<?q.Content, Error>
}

export default slurp(({ auth }: State, { activity }: ExpectedProps) => ({
  content: subscribe(q.fetchActivityContent, auth.sync, activity)
}))
