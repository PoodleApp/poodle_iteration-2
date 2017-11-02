/* @flow */

import test from 'ava'

import Address from '../../src/models/Address'

const addr = new Address({ name: 'Jesse', mailbox: 'jesse', host: 'sitr.us' })

test('displays an email address', t => {
  t.plan(1)
  t.is(addr.email, 'jesse@sitr.us')
})
