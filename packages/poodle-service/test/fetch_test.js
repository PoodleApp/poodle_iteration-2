/* @flow */

import test from 'ava'
import * as json from 'format-json'
import * as google from '../src/models/ImapAccount/google'
import * as googletest from './models/ImapAccount/google'
import * as promises from '../src/util/promises'

const msgId = '55dad9e6.633e460a.c2b46.ffffce8f@mx.google.com'

// TODO: redesign test suite
test('ok', t => {
  t.plan(1)
  t.pass()
})

// export default function test() {
//   return [
//     testFetchMessage,
//     testFetchMessagePart,
//   ]
//   .reduce(
//     (test, nextTestFn) => test.then(nextTestFn),
//     Promise.resolve()
//   )
// }

// async function testFetchMessage() {
//   const tokGen = await googletest.getTokenGenerator()
//   const conn   = await google.getConnection(tokGen)
//   const box    = await imaputil.openAllMail(true, conn)
//   const msg    = await googleactions.fetchMessage(msgId, box, conn)

//   console.log('downloaded message:')
//   console.log(json.plain(msg))
//   console.log('')
// }

// async function testFetchMessagePart() {
//   const tokGen = await googletest.getTokenGenerator()
//   const conn   = await google.getConnection(tokGen)
//   const box    = await imaputil.openAllMail(true, conn)
//   const msg    = await googleactions.fetchMessage(msgId, box, conn)
//   const part   = await actions.fetchMessagePart(msg, '1.2', box, conn)

//   console.log('message part:')
//   part.pipe(process.stdout)
//   console.log('')

//   return promises.lift0(cb => part.addListener('end', cb))
// }
