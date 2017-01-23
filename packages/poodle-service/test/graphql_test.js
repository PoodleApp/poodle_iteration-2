/* @flow */

import * as json       from 'format-json'
import * as google     from '../src/oauth/google'
import * as googletest from './oauth/google'
import { graphql }     from '../src'

const msgId = '55dad9e6.633e460a.c2b46.ffffce8f@mx.google.com'

export default function test() {
  const tests = [
    testQueryMessage,
    testQueryThread,
  ]
  return tests.reduce(
    (lastResult, test) => lastResult.then(test),
    Promise.resolve()
  )
}

const messageById = `
query MessageById($msgId: String!) {
  allMail: box(attribute: "\\\\All") {
    messages(id: $msgId) {
      flags
      date
      envelope {
        messageId
        subject
        from { name }
        to { name }
      }
      xGmLabels
    }
  }
}
`

const threadById = `
query ThreadById($query: String!) {
  allMail: box(attribute: "\\\\All") {
    threads(search: $query) {
      id
      messages {
        flags
        date
        envelope {
          messageId
          subject
          from { name }
          to { name }
        }
        xGmLabels
      }
    }
  }
}
`

async function testQueryMessage() {
  const tokGen = await googletest.getTokenGenerator()
  const connectionFactory = () => google.getConnection(tokGen)
  const result = await graphql(messageById, connectionFactory, { msgId })

  console.log("\n")
  console.log('result of message query:')
  console.log(json.plain(result))
  console.log('')
}

async function testQueryThread() {
  const tokGen = await googletest.getTokenGenerator()
  const connectionFactory = () => google.getConnection(tokGen)
  const query = `rfc822msgid:${msgId}`
  const result = await graphql(threadById, connectionFactory, { query })

  console.log("\n")
  console.log('result of thread query:')
  console.log(json.plain(result))
  console.log('')
}
