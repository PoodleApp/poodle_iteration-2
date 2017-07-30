/* @flow */

import test from 'ava'

import * as chromeActions from '../../src/actions/chrome'
import reducer, * as chromeState from '../../src/reducers/chrome'

const initialState = reducer(undefined, chromeActions.leftNavToggle(true))

test('has initial state', t => {
  t.plan(1)
  t.true(initialState.leftNavOpen, 'left nav is initially open')
})

test('returns `undefined` if nothing is loading', t => {
  t.plan(1)
  const msg = chromeState.loadingMessage(initialState)
  t.is(msg, undefined, 'nothing is loading')
})

test('shows loading message', t => {
  t.plan(1)
  const state = reducer(
    initialState,
    chromeActions.indicateLoading('fetching', 'Fetching data...')
  )
  const msg = chromeState.loadingMessage(state)
  t.is(msg, 'Fetching data...', 'expected a loading message')
})

test('shows loading messages for a given key', t => {
  t.plan(2)
  const state = reducer(
    initialState,
    chromeActions.indicateLoading('fetching', 'Fetching data...')
  )
  const msgs = chromeState.loadingMessagesFor('fetching', state)
  t.is(msgs.length, 1, 'expected one loading message')
  t.is(msgs[0], 'Fetching data...', 'expected a loading message')
})

test('removes loading messages', t => {
  t.plan(2)

  let state = reducer(
    initialState,
    chromeActions.indicateLoading('fetching', 'Fetching data...')
  )
  let msgs = chromeState.loadingMessagesFor('fetching', state)
  t.is(msgs.length, 1, 'expected one loading message')

  state = reducer(state, chromeActions.doneLoading('fetching'))
  msgs = chromeState.loadingMessagesFor('fetching', state)
  t.is(msgs.length, 0, 'expected zero loading messages')
})
