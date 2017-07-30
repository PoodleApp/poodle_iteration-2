/* @flow */

import test from 'ava'
import kefir from 'kefir'
import React from 'react'
import { Provider, connect } from 'react-redux'
import ReactTestRenderer from 'react-test-renderer'
import { combineReducers, createStore } from 'redux'

import * as slurp from '../../src/slurp'
import * as actions from '../../src/slurp/actions'

const store = createStore(
  combineReducers({
    slurp: slurp.reducer
  })
)

const syncStub = {}
store.dispatch(actions.setSync((syncStub: any)))

const states = (initialCount: number = 0) => {
  const values = [0, 1, 2, 3].map(value => value + initialCount)
  return kefir.sequentially(0, values).map(n => ({ count: n }))
}

test('supplies data to component', async t => {
  t.plan(2)
  const C = slurp.slurp(() => ({
    count: states()
  }))(Counter)

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <C />
    </Provider>
  )

  const display = getCounterDisplay(renderer)
  t.is(display, 'loading')

  await delay(50)

  t.is(getCounterDisplay(renderer), 3)
})

test('runs callback only once if props do not change', async t => {
  t.plan(1)

  let callCount = 0
  const C = slurp.slurp(() => {
    callCount += 1
    return {
      count: states()
    }
  })(Counter)

  const renderer = ReactTestRenderer.create(
    <Provider store={store}>
      <C />
    </Provider>
  )

  await delay(50)

  t.is(callCount, 1)
})

test('unsubscribes from streams when component unmounts', async t => {
  t.plan(1)

  const observable = kefir.stream(emitter => {
    states().onValue(v => {
      emitter.emit(v)
    })
    return function unsubscribe () {
      t.pass('stream is unsubscribed when component unmounts')
    }
  })

  const C = slurp.slurp(() => ({
    count: observable
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
  await delay(10)
})

test('re-suscribes to sources when props change', async t => {
  t.plan(4)

  let callCount = 0
  const C = slurp.slurp(({ initialCount }) => {
    callCount += 1
    return {
      count: states(initialCount)
    }
  })(Counter)

  let emitProps
  const props = kefir.stream(emitter => {
    emitProps = emitter.emit
  })

  let onRender
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
  await delay(25)

  t.is(getCounterDisplay(renderer), 13)
  t.is(callCount, 1)

  emitProps && emitProps({ initialCount: 100 })

  await secondRender
  await delay(25)

  t.is(getCounterDisplay(renderer), 103)
  t.is(callCount, 2)
})

test('does not re-subscribe on props change if same observable reference is given', async t => {
  t.plan(4)

  const observable = kefir.stream(emitter => {
    states().onValue(v => {
      emitter.emit(v)
    })
    return function unsubscribe () {
      t.fail('stream is not unsubscribed when props change')
    }
  })

  let callCount = 0
  const C = slurp.slurp(({ initialCount }) => {
    callCount += 1
    return {
      count: observable
    }
  })(Counter)

  let emitProps
  const props = kefir.stream(emitter => {
    emitProps = emitter.emit
  })

  let onRender
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
  await delay(25)

  t.is(getCounterDisplay(renderer), 3)
  t.is(callCount, 1)

  emitProps && emitProps({ initialCount: 100 })

  await secondRender
  await delay(25)

  t.is(getCounterDisplay(renderer), 3)
  t.is(callCount, 2)
})

test('`dispatch` function is available', async t => {
  t.plan(1)

  function CheckForDispatch (props) {
    t.is(typeof props.dispatch, 'function', '`dispatch` is not visible')
    return <div />
  }

  const C = slurp.slurp(() => ({
    count: states()
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

  const C = slurp.slurp(ownProps => {
    t.true(ownProps.connected, 'receives props from redux state')
    return {
      count: states()
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

function assertType<T> (x: T, fn: (_: T) => void) {}

// React components for testing

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

function getCounterDisplay (renderer) {
  return renderer.toJSON().children[0]
}

class PropUpdater extends React.Component<
  void,
  {
    onRender: (props: Object) => void,
    props: kefir.Observable<Object>,
    children: React.Element<*>[]
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
      return React.cloneElement(child, this.state.props)
    } else {
      return <div />
    }
  }
}

class MountChildBriefly extends React.Component<
  void,
  { children: React.Element<*>[], onUnmount: Function },
  { childMounted: boolean }
> {
  state: { childMounted: boolean }

  constructor (props, context) {
    super(props, context)
    this.state = { childMounted: true }
  }

  componentDidMount () {
    setTimeout(() => this.setState({ childMounted: false }), 25)
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
