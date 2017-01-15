/* @flow */

import * as google       from '../src/oauth/google'
import * as capabilities from '../src/capabilities'
import * as googletest   from './oauth/google'

export default async function testGetCapabilities() {
  const tokGen = await googletest.getTokenGenerator()
  const conn   = await google.getConnection(tokGen)

  console.log('server capabilities:')
  for (const cap of [
    capabilities.googleExtensions,
    capabilities.sort,
    capabilities.threadReferences,
    capabilities.threadOrderedSubject,
  ]) {
    console.log(`server supports ${cap}:`, conn.serverSupports(cap))
  }
  console.log('')
}
