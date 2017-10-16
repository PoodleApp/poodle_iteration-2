/* @flow */

import test from 'ava'

import State from '../../src/util/State'

type FooState = { count: number }
type Foo<A> = State<A, FooState>

test('infers type parameter from `then` callback that returns a plain value', async t => {
  t.plan(2)
  const state: State<string, FooState> = State.result('foo')
  const x: State<number, FooState> = state.then(str => str.length)

  // $FlowFixMe: `string` is not compatible with `number`
  const y: State<string, FooState> = state.then(str => str.length)

  t.is(await x.eval({ count: 0 }), 3)

  const foo: Foo<string> = State.result('foo')
  const a: Foo<number> = foo.then(str => str.length)

  // $FlowFixMe: `string` is not compatible with `number`
  const b: Foo<string> = foo.then(str => str.length)

  t.is(await a.eval({ count: 0 }), 3)
})

test('infers type parameter from `then` callback that returns a `State` value', async t => {
  t.plan(2)
  const state: State<string, FooState> = State.result('foo')
  const x: State<number, FooState> = state.then(s => State.result(s.length))

  // $FlowFixMe: `string` is not compatible with `number`
  const y: State<string, FooState> = state.then(s => s.length)

  t.is(await x.eval({ count: 0 }), 3)

  const foo: Foo<string> = State.result('foo')
  const a: Foo<number> = foo.then(s => State.result(s.length))

  // $FlowFixMe: `string` is not compatible with `number`
  const b: Foo<string> = foo.then(s => s.length)

  t.is(await a.eval({ count: 0 }), 3)
})
