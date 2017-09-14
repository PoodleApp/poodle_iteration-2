/* @flow */

import * as kefir from 'kefir'
import nextTick from 'process-nextick-args'

type Job<A, B> = {
  payload: A,
  emitter: kefir.Emitter<B, Error>
}

type Processor<A, B> = (payload: A) => kefir.Observable<B>

export default class JobQueue<A, B> {
  _busy: boolean
  _jobs: Job<A, B>[]
  _processor: Processor<A, B>

  constructor (processor: Processor<A, B>) {
    this._busy = false
    this._jobs = []
    this._processor = processor
  }

  process (payload: A): kefir.Observable<B> {
    return new kefir.stream(emitter => {
      const job = { emitter, payload }
      this._jobs.push(job)
      nextTick(() => this._run())
    })
  }

  _run () {
    if (this._busy || this._jobs.length < 1) {
      return
    }
    this._busy = true
    const job = this._jobs.shift()
    try {
      const result = this._processor.call(null, job.payload)
      result.observe((job.emitter: any))
      result.onEnd(() => {
        this._busy = false
        if (this._jobs.length > 0) {
          nextTick(() => this._run())
        }
      })
    } finally {
      this._busy = false
    }
  }
}
