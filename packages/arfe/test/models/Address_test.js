/* @flow */

import describe from 'tape'

import Address from '../../src/models/Address'

describe('Address', ({ test }) => {

  const addr = new Address({ name: 'Jesse', mailbox: 'jesse', host: 'sitr.us' })

  test('displays an email address', t => {
    t.plan(1)
    t.equal(addr.email, 'jesse@sitr.us')
  })

})
