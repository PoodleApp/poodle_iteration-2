/* @flow */

import * as kefir from 'kefir'
import type PouchDB from 'pouchdb-node'
import { type Action } from '../request/actions'
import { type ConnectionState, authenticated } from '../request/state'

type Context = {
  performRequest: <A>(action: Action<A>, state: ConnectionState) => Obs<A>,
  db: PouchDB
}

type State = ConnectionState

type Run<A> = (c: Context, s: State) => Obs<{ value: A, state: State }>

type Obs<R> = kefir.Observable<R, Error>

export default class Task<A> {
  run: Run<A>

  static result<A> (value: A): Task<A> {
    return new Task((context, state) => kefir.constant({ value, state }))
  }

  static getContext (): Task<Context> {
    return new Task((context, state) =>
      kefir.constant({ value: context, state })
    )
  }

  /*
   * Task that resolves to the state of the IMAP connection
   */
  static getState<A> (): Task<State> {
    return new Task((context, state) => kefir.constant({ value: state, state }))
  }

  static putState (state: State): Task<void> {
    return new Task((context, s0) =>
      kefir.constant({ value: undefined, state })
    )
  }

  static modifyState (f: (s: State) => State): Task<void> {
    return Task.getState().flatMap(state => Task.putState(f(state)))
  }

  static lift<A> (obs: Obs<A>): Task<A> {
    return new Task((context, state) => obs.map(value => ({ value, state })))
  }

  static liftPromise<A> (promise: Promise<A>): Task<A> {
    return new Task((context, state) =>
      kefir.fromPromise(promise.then(value => ({ value, state })))
    )
  }

  static error<A> (e: Error): Task<A> {
    return new Task((context, state) => kefir.constantError(e))
  }

  // Processes tasks in parallel; combines the streams from running each input
  // task into one stream. State changes made when running input tasks do not
  // affect states of other input tasks, or of tasks that run after `par` is
  // invoked.
  static par<A> (ts: Task<A>[]): Task<A> {
    return new Task((context, state) =>
      kefir
        .merge(ts.map(t => t.perform(context, state)))
        .map(value => ({ value, state }))
    )
  }

  constructor (run: Run<A>) {
    this.run = run
  }

  perform (
    context: Context,
    initialState: ConnectionState = authenticated
  ): Obs<A> {
    return this.run(context, initialState).map(({ value }) => value)
  }

  flatMap<B> (fn: (a: A) => Task<B>): Task<B> {
    return new Task((context, s0) =>
      this.run(context, s0).flatMap(({ value, state: s1 }) =>
        fn(value).run(context, s1)
      )
    )
  }

  map<B> (fn: (a: A) => B): Task<B> {
    return new Task((context, s0) =>
      this.run(context, s0).map(({ value, state: s1 }) => ({
        value: fn(value),
        state: s1
      }))
    )
  }

  // Apply a transformation to the underlying `Observable`
  modifyObservable<B> (fn: (obs: Obs<A>) => Obs<B>): Task<B> {
    return new Task((context, state) => {
      const obs = this.run(context, state)
      return fn(obs.map(({ value }) => value)).map(value => ({ value, state }))
    })
  }
}
