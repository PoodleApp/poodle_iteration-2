/* @flow */

import { ipcMain } from 'electron'
import { AccountService } from 'poodle-service/lib/accounts/AccountService'

const service = new AccountService()
service.serve(ipcMain)
export default service
