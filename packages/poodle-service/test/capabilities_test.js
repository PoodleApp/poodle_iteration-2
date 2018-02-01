/* @flow */

import test from 'ava'
import * as capabilities from '../src/capabilities'
import * as google from '../src/models/ImapAccount/google'
import * as googletest from './models/ImapAccount/google'

// TODO: redesign test suite
test('ok', t => {
  t.plan(1)
  t.pass()
})

export default async function testGetCapabilities () {
  const tokGen = await googletest.getTokenGenerator()
  const conn = await google.getConnection(tokGen)

  console.log('server capabilities:')
  for (const cap of [
    capabilities.googleExtensions,
    capabilities.sort,
    capabilities.threadReferences,
    capabilities.threadOrderedSubject
  ]) {
    console.log(`server supports ${cap}:`, conn.serverSupports(cap))
  }
  console.log('')
}
