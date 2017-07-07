/* @flow */

import test from 'ava'
import kefir from 'kefir'
import React from 'react'
import { Provider } from 'react-redux'
import ReactTestRenderer from 'react-test-renderer'
import { combineReducers, createStore } from 'redux'
import { localReducer } from 'redux-fractal'

import slurp, { SlurpError } from '../src'

const store = createStore(
  combineReducers({
    local: localReducer
  })
)

const states = () =>
  kefir.sequentially(0, [0, 1, 2, 3]).map(n => ({ count: n }))

function MinimalComponent (props) {
  return <div />
}

function Counter (props) {
  const value = props.count.value

  if (value) {
    assertType(value.count, (x: number) => {})

    // $ExpectError
    assertType(value.count, (x: string) => {})
  }

  return (
    <div>
      {value ? value.count : 'loading'}
    </div>
  )
}

test('throws an error if no observables are given', t => {
  t.plan(1)
  const C = slurp(() => ({
    count: 1
  }))(MinimalComponent)
  t.throws(() => {
    const renderer = ReactTestRenderer.create(
      <Provider store={store}>
        <C />
      </Provider>
    )
  }, SlurpError)
})

test.cb('supplies data to component', t => {
  t.plan(2)
  const C = slurp(() => ({
    count: states()
  }))(Counter)

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <C />
    </Provider>
  )

  const display = renderer.toJSON().children[0]
  t.is(display, 'loading')

  setTimeout(() => {
    const display = renderer.toJSON().children[0]
    t.is(display, 3)
    t.end()
  }, 50)
})

// test('runs callback only once if props do not change')

function assertType<T> (x: T, fn: (_: T) => void) {}
