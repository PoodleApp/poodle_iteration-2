/* @flow */

import nextTick from 'process-nextick-args'

type Job<A, B> = {
  payload: A,
  resolve: (_: B) => void,
  reject: (_: Error) => void
}

type Processor<A, B> = (payload: A) => Promise<B>

export default class JobQueue<A, B> {
  _busy: boolean
  _jobs: Job<A, B>[]
  _processor: Processor<A, B>

  constructor (processor: Processor<A, B>) {
    this._busy = false
    this._jobs = []
    this._processor = processor
  }

  process (payload: A): Promise<B> {
    return new Promise((resolve, reject) => {
      const job = { resolve, reject, payload }
      this._jobs.push(job)
      nextTick(() => this._run())
    })
  }

  async _run () {
    if (!this._busy || this._jobs.length < 1) {
      return
    }
    this._busy = true
    const job = this._jobs.shift()
    try {
      await this._processor
        .call(null, job.payload)
        .then(job.resolve, job.reject)
    } finally {
      this._busy = false
    }
    if (this._jobs.length > 0) {
      nextTick(() => this._run())
    }
  }
}
