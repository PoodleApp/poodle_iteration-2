/* @flow */

import test from 'ava'
import kefir from 'kefir'
import * as kefirUtil from '../../src/util/kefir'

test('`scan` does not reset accumulator on errors', async t => {
  t.plan(1)
  const stream = kefir.stream(({ emit, error, end }) => {
    emit(1)
    emit(2)
    error(new Error('error in observable'))
    emit(3)
    end()
  })
  const result = await kefirUtil
    .scan(stream, (total, n) => total + n, 0)
    .toPromise()
  t.is(result, 6)
})

test('`takeAll` gets array from stream of values', async t => {
  t.plan(1)
  const stream = kefir.sequentially(0, [1, 2, 3])
  const values = await kefirUtil.takeAll(stream).toPromise()
  t.deepEqual(values, [1, 2, 3])
})

test('`takeAll` produces an empty array if the stream emits no values', async t => {
  t.plan(1)
  const stream = kefir.never()
  const values = await kefirUtil.takeAll(stream).toPromise()
  t.deepEqual(values, [])
})
