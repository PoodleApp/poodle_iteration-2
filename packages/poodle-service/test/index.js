/* @flow */

import capabilitiesTest from './capabilities_test'
import fetchTest from './fetch_test'

const tests = [capabilitiesTest, fetchTest]

tests
  .reduce((test, nextTestFn) => test.then(nextTestFn), Promise.resolve())
  .then(_ => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
