/* @flow */

import db from './db'
import * as Imap from 'poodle-service/lib/ImapInterface/Server'

const imapService = Imap.NewServer(db)
export default imapService
