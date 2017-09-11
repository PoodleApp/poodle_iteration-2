/* @flow */

import { ipcRenderer } from 'electron'
import * as Imap from 'poodle-service/lib/ImapInterface/Client'

const imapClient = Imap.NewClient(ipcRenderer)
export default imapClient
