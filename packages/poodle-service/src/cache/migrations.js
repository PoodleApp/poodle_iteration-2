/* @flow */

import * as DB from './indexeddb'

const migrations: DB.Migrations = [messagesAndContentParts]
export default migrations

function messagesAndContentParts (db) {
  const messages = db.createObjectStore('messages', { keyPath: '_id' })
  messages.createIndex('conversationId', 'conversationId', { unique: false })
  messages.createIndex('googleThreadId', 'message.x-gm-thrid', {
    unique: false
  })
  messages.createIndex('imapLocations', 'imapLocations', {
    unique: true,
    multiEntry: true
  })

  const parts = db.createObjectStore('messageParts', { keyPath: '_id' })
}
