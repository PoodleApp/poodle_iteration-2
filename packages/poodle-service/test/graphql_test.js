/* @flow */

import { graphql }     from 'graphql'
import * as json       from 'format-json'
import * as google     from '../src/oauth/google'
import * as googletest from './oauth/google'
import schema          from '../src/schema'

const msgId = '55dad9e6.633e460a.c2b46.ffffce8f@mx.google.com'

export default function test() {
  return testQueryMessage()
}

const messageById = `
query MessageById($msgId: String!) {
  box(attribute: "\\\\All") {
    messages(id: $msgId) {
      flags
      date
      envelope {
        subject
        from { name }
        to { name }
      }
      size
      xGmLabels
    }
  }
}
`

async function testQueryMessage() {
  const tokGen = await googletest.getTokenGenerator()
  const conn   = await google.getConnection(tokGen)
  const result = await graphql(schema, messageById, null, { conn }, { msgId })

  console.log("\n")
  console.log('result of query:')
  console.log(json.plain(result))
  console.log('')
}
