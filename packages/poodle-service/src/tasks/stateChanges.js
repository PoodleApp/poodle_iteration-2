/* @flow */

import Task from './Task'
import { type BoxSpecifier } from '../request'
import * as S from '../request/state'

export function closeBox (
  autoExpunge: boolean = true
): Task<void> {
  return Task.modifyState(state => ({
    ...state,
    connectionState: S.authenticated
  }))
}

export function openBox (
  boxSpec: BoxSpecifier,
  readonly: boolean = true
): Task<void> {
  return Task.modifyState(state => ({
    ...state,
    connectionState: S.openBox(boxSpec, readonly)
  }))
}
