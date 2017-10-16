/* @flow */

const ok = Promise.resolve
const err = Promise.reject

export default class State<A, S> {
  run: (initialState: S) => Promise<{ value: A, state: S }>

  static result<A, S> (value: A): State<A, S> {
    return new State(state => ok({ state, value }))
  }

  static error<A, S> (error: Error): State<A, S> {
    return new State(state => err(error))
  }

  static getState<S> (): State<S, S> {
    return new State(state => ok({ value: state, state }))
  }

  static modifyState<S> (f: (s: S) => S): State<void, S> {
    return State.getState().flatMap(state => State.putState(f(state)))
  }

  static putState<S> (state: S): State<void, S> {
    return new State(s0 => ok({ value: undefined, state }))
  }

  static lift<A, S> (promise: Promise<A>): State<A, S> {
    return new State(state => promise.then(value => ({ state, value })))
  }

  /*
   * Evaluate a list of state actions, feeding the resulting state from each
   * action into the next. This version ignores result values.
   */
  static sequence_<A, S> (inputs: State<A, S>[]): State<void, S> {
    const [input, ...rest] = inputs
    return input
      ? input.flatMap(value => State.sequence_(rest))
      : State.result(undefined)
  }

  constructor (run: (initialState: S) => Promise<{ value: A, state: S }>) {
    this.run = run
  }

  eval (initialState: S): Promise<A> {
    return this.run(initialState).then(({ value }) => value)
  }

  exec (initialState: S): Promise<S> {
    return this.run(initialState).then(({ state }) => state)
  }

  flatMap<B> (fn: (a: A) => State<B, S>): State<B, S> {
    return new State(s0 =>
      this.run(s0).then(({ value, state: s1 }) => fn(value).run(s1))
    )
  }

  map<B> (fn: (a: A) => B): State<B, S> {
    return new State(s0 =>
      this.run(s0).then(({ value, state: s1 }) => ({
        value: fn(value),
        state: s1
      }))
    )
  }

  then<B> (fn: (a: A) => State<B, S> | B): State<B, S> {
    return new State(s0 =>
      this.run(s0).then(({ value, state: s1 }) => {
        const result = fn(value)
        if (result instanceof State) {
          return result.run(s1)
        } else {
          return { value: result, state: s1 }
        }
      })
    )
  }
}
