/* @flow */

import db from './db'
import { ipcRenderer } from 'electron'
import * as Imap from 'poodle-service/lib/ImapInterface/Client'

ipcRenderer.setMaxListeners(100)
const imapClient = Imap.NewClient(ipcRenderer, db)
export default imapClient
