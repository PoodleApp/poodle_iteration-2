/* @flow */

import cachedir from 'cache-directory'
import mkdirp from 'mkdirp'
import * as path from 'path'
import { createIndexes } from 'poodle-service/lib/cache/query'
import findPlugin from 'pouchdb-find'
import PouchDB from 'pouchdb-node'

PouchDB.plugin(findPlugin)

const location = cachedir(path.join('poodle', 'db'))
mkdirp.sync(location)
const db = new PouchDB(location, { adapter: 'leveldb' })
createIndexes(db)
export default db
