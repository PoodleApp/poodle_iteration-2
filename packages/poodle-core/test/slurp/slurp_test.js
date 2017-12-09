/* @noflow */
// TODO

import test from 'ava'
import kefir from 'kefir'
import * as React from 'react'
import { type ConnectedComponentClass, Provider, connect } from 'react-redux'
import ReactTestRenderer from 'react-test-renderer'
import { combineReducers, createStore } from 'redux'

import { type Slurp, reducer as slurpReducer, slurp } from '../../src/slurp'
import * as effects from '../../src/slurp/effects'

const store = createStore(
  combineReducers({
    slurp: slurpReducer
  })
)

const states = (initialCount: number = 0) => {
  const values = [0, 1, 2, 3].map(value => value + initialCount)
  return kefir.sequentially(0, values).map(n => ({ count: n }))
}

test('supplies data to component from an observable source', async t => {
  t.plan(2)
  const C = slurp(() => ({
    count: effects.subscribe(states)
  }))(Counter)

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <C />
    </Provider>
  )

  const display = getCounterDisplay(renderer)
  t.is(display, 'loading')

  await delay(250)

  t.is(getCounterDisplay(renderer), 3)
})

test('accepts prop values that are not observable or promise effects', async t => {
  t.plan(2)

  function Foo (props) {
    t.false(props.count.complete)
    t.is(props.foo, 1)
    return <div>props.foo</div>
  }

  const C = slurp(() => ({
    count: effects.subscribe(states),
    foo: 1
  }))(Foo)

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <C />
    </Provider>
  )
})

test('unsubscribes from streams when component unmounts', async t => {
  t.plan(1)

  const observable = () =>
    kefir.stream(emitter => {
      states().onValue(v => {
        emitter.emit(v)
      })
      return function unsubscribe () {
        t.pass('stream is unsubscribed when component unmounts')
      }
    })

  const C = slurp(() => ({
    count: effects.subscribe(observable)
  }))(Counter)

  let resolve
  const unmount = new Promise(r => (resolve = r))
  function onUnmount () {
    resolve && resolve()
  }

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <MountChildBriefly onUnmount={onUnmount}>
        <C />
      </MountChildBriefly>
    </Provider>
  )

  await unmount
  await delay(250)
})

test('re-subscribes to sources when props change', async t => {
  t.plan(4)

  let callCount = 0
  function statesSpy (initialCount) {
    callCount += 1
    return states(initialCount)
  }

  const C = slurp((state, { initialCount }) => ({
    count: effects.subscribe(statesSpy, initialCount)
  }))(Counter)

  let emitProps
  const props = kefir.stream(emitter => {
    emitProps = emitter.emit
  })

  let onRender = noop
  const renders = kefir.stream(emitter => {
    onRender = v => emitter.emit(v)
  })

  const firstRender = renders.take(1).toPromise()
  const secondRender = renders.skip(1).take(1).toPromise()

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <PropUpdater onRender={onRender} props={props}>
        <C />
      </PropUpdater>
    </Provider>
  )

  emitProps && emitProps({ initialCount: 10 })

  await firstRender
  await delay(250)

  t.is(getCounterDisplay(renderer), 13)
  t.is(callCount, 1)

  emitProps && emitProps({ initialCount: 100 })

  await secondRender
  await delay(250)

  t.is(getCounterDisplay(renderer), 103)
  t.is(callCount, 2)
})

test('does not re-subscribe on props change if same effect is given', async t => {
  t.plan(4)

  let callCount = 0
  const observable = initialCount => {
    callCount += 1
    return kefir.stream(emitter => {
      states(initialCount).onValue(v => {
        emitter.emit(v)
      })
      return function unsubscribe () {
        t.fail('stream is not unsubscribed when props change')
      }
    })
  }

  const C = slurp((state, { initialCount }) => ({
    count: effects.subscribe(observable, 0)
  }))(Counter)

  let emitProps
  const props = kefir.stream(emitter => {
    emitProps = emitter.emit
  })

  let onRender = noop
  const renders = kefir.stream(emitter => {
    onRender = v => emitter.emit(v)
  })

  const firstRender = renders.take(1).toPromise()
  const secondRender = renders.skip(1).take(1).toPromise()

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <PropUpdater onRender={onRender} props={props}>
        <C />
      </PropUpdater>
    </Provider>
  )

  emitProps && emitProps({ initialCount: 10 })

  await firstRender
  await delay(250)

  t.is(getCounterDisplay(renderer), 3)
  t.is(callCount, 1)

  emitProps && emitProps({ initialCount: 100 })

  await secondRender
  await delay(250)

  t.is(getCounterDisplay(renderer), 3)
  t.is(callCount, 1)
})

test('`dispatch` function is available', async t => {
  t.plan(1)

  function CheckForDispatch (props) {
    t.is(typeof props.dispatch, 'function', '`dispatch` is not visible')
    return <div />
  }

  const C = slurp(() => ({
    count: effects.subscribe(states)
  }))(CheckForDispatch)

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <C />
    </Provider>
  )
})

test('local `dispatch` function does not shadow `dispatch` from use of `connect`', async t => {
  t.plan(2)

  function CheckForDispatch (props) {
    t.is(
      typeof props.dispatch,
      'function',
      '`dispatch` is provided by `connect`'
    )
    return <div />
  }

  const C = slurp((state, ownProps) => {
    t.true(ownProps.connected, 'receives props from redux state')
    return {
      count: effects.subscribe(states)
    }
  })(CheckForDispatch)

  const C_ = connect((state, ownProps) => ({
    connected: true
  }))(C)

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <C_ />
    </Provider>
  )
})

test('before subscription has emitted a value, calling `reload` recreates subscription', async t => {
  t.plan(2)

  let subscribeCount = 0
  let unsubscribeCount = 0
  const observable = () =>
    kefir.stream(emitter => {
      subscribeCount += 1
      states().onValue(v => {
        emitter.emit(v)
      })
      return function unsubscribe () {
        unsubscribeCount += 1
      }
    })

  let firstRender = true
  function MyComponent (props) {
    const value = props.count.value
    if (firstRender) {
      props.count.reload()
      firstRender = false
    }
    return (
      <div>
        {value ? value.count : 'loading'}
      </div>
    )
  }

  const C = slurp(() => ({
    count: effects.subscribe(observable)
  }))(MyComponent)

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <C />
    </Provider>
  )

  await delay(250)
  t.is(subscribeCount, 2)
  t.is(unsubscribeCount, 1)
})

test('after subscription has emitted a value, calling `reload` recreates subscription', async t => {
  t.plan(2)

  let subscribeCount = 0
  let unsubscribeCount = 0
  const observable = () =>
    kefir.stream(emitter => {
      subscribeCount += 1
      states().onValue(v => {
        emitter.emit(v)
      })
      return function unsubscribe () {
        unsubscribeCount += 1
      }
    })

  let firstRender = true
  function MyComponent (props) {
    const value = props.count.value
    if (firstRender && value) {
      props.count.reload()
      firstRender = false
    }
    return (
      <div>
        {value ? value.count : 'loading'}
      </div>
    )
  }

  const C = slurp(() => ({
    count: effects.subscribe(observable)
  }))(MyComponent)

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <C />
    </Provider>
  )

  await delay(250)
  t.is(subscribeCount, 2)
  t.is(unsubscribeCount, 1)
})

function assertType<T> (x: T, fn: (_: T) => void) {}

// React components for testing

function MinimalComponent (props) {
  return <div />
}

function Counter (props: {
  count: Slurp<{ count: number }, empty>,
  initialCount?: number
}) {
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

function getCounterDisplay (renderer) {
  return renderer.toJSON().children[0]
}

class PropUpdater extends React.Component<
  {
    onRender: (props: Object) => void,
    props: kefir.Observable<Object>,
    children: React.Element<any>
  },
  { props?: Object }
> {
  state: { props?: Object }

  constructor (props, context) {
    super(props, context)
    this.state = {}
    props.props.onValue(props => this.setState({ props }))
  }

  render () {
    if (this.state.props) {
      this.props.onRender(this.props)
      const child = React.Children.only(this.props.children)
      return React.cloneElement(child, (this.state.props: any))
    } else {
      return <div />
    }
  }
}

class MountChildBriefly extends React.Component<
  { children: React.Element<any>, onUnmount: Function },
  { childMounted: boolean }
> {
  state: { childMounted: boolean }

  constructor (props, context) {
    super(props, context)
    this.state = { childMounted: true }
  }

  componentDidMount () {
    setTimeout(() => this.setState({ childMounted: false }), 50)
  }

  render () {
    if (this.state.childMounted) {
      const child = React.Children.only(this.props.children)
      return React.cloneElement(child, {})
    } else {
      this.props.onUnmount()
      return <div />
    }
  }
}

function delay (t) {
  return new Promise(resolve => {
    setTimeout(resolve, t)
  })
}

function noop () {}
