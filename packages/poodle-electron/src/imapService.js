/* @flow */

import db from './db'
import { ipcRenderer } from 'electron'
import * as Imap from 'poodle-service/lib/ImapInterface/Server'

const imapClient = Imap.NewServer(ipcRenderer, db)
export default imapClient
