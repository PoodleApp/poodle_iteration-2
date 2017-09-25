/* @flow */

import * as kefir from 'kefir'
import type PouchDB from 'pouchdb-node'
import { type Action as AccountAction } from '../accounts/actions'
import { type Action as RequestAction } from '../request/actions'
import { type ConnectionState, any } from '../request/state'
import { type Email } from '../types'
import * as kefirUtil from '../util/kefir'

export type State = {
  accountName: ?Email,
  connectionState: ConnectionState
}

export type Context = {
  runAccountAction: <A>(action: AccountAction<A>) => Obs<A>,
  runImapAction: <A>(action: RequestAction<A>, state: State) => Obs<A>,
  db: PouchDB
}

type Run<A> = (c: Context, s: State) => Obs<{ value: A, state: State }>

type Obs<R> = kefir.Observable<R, Error>

const initialState: State = {
  accountName: undefined,
  connectionState: any
}

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

  /*
   * State changes made by the given task do not affect tasks made after the
   * `isolate` call
   */
  static isolate<A> (task: Task<A>): Task<A> {
    return new Task((context, state) =>
      task.perform(context, state)
      .map(value => ({ value, state }))
    )
  }

  /*
   * Processes tasks in parallel; combines the streams from running each input
   * task into one stream. State changes made when running input tasks do not
   * affect states of other input tasks, or of tasks that run after `par` is
   * invoked.
   */
  static par<A> (ts: Task<A>[]): Task<A> {
    return new Task((context, state) =>
      kefir
        .merge(ts.map(t => t.perform(context, state)))
        .map(value => ({ value, state }))
    )
  }

  /*
   * Runs tasks one after the other. State changes made when running input tasks
   * do not affect states of other input tasks, or of tasks that run after `seq`
   * is invoked.
   */
  static seq<A> (ts: Task<A>[]): Task<A> {
    return new Task((context, state) => {
      function rec(i) {
        const t = ts[i]
        if (t) {
          return kefirUtil.andThen(t.perform(context, state), () => rec(i + 1))
        } else {
          return kefir.never()
        }
      }
      return rec(0).map(value => ({ value, state }))
    })
  }

  /*
   * Given a function that produces a `Task`, returns a `Task` that resolves to
   * a version of the function that returns a `Promise`.
   */
  // static promisify<A, F: (...args: any) => Task<A>> (
  //   taskFn: F
  // ): $Compose

  static promisify<A, Args: *> (
    taskFn: (...args: Args) => Task<A>
  ): Task<(...args: Args) => Promise<A>> {
    return new Task((context, state) =>
      kefir.constant({
        value: (...args) =>
          taskFn(...args).perform(context, state).toPromise(),
        state
      })
    )
  }

  constructor (run: Run<A>) {
    this.run = run
  }

  perform (context: Context, initialState: State = initialState): Obs<A> {
    return this.run(context, initialState).map(({ value }) => value)
  }

  catMaybes (): Task<$NonMaybeType<A>> {
    return this.filter(a => !!a)
  }

  filter (fn: (a: A) => boolean): Task<A> {
    return this.modifyObservable(obs => obs.filter(fn))
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
