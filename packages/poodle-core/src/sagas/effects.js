/* @flow strict */

import { type Observable } from "kefir"
import { type CallEffect } from "redux-saga"
import { call } from "redux-saga/effects"

/*
 * `callObservableProducer` works like Redux Saga's built-in `call` effect,
 * except that it is used to call a function that returns an `Observable`
 * instead of a `Promise`. The `Observable` is automatically converted to
 * a promise using its `toPromise()` method.
 */
export function callObservableProducer<Args: *, R>(
  fn: (...args: Args) => Observable<R, any>,
  ...args: Args
): CallEffect<null, (...args: Args) => Promise<R>, Args> {
  return (call: any)((...args) => observableToPromise(fn(...args)), ...args)
}

function observableToPromise<T>(obs: Observable<T, any>): Promise<T> {
  return obs.toPromise()
}
