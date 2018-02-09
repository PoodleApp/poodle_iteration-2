/* @flow */

import { AccountService } from 'poodle-service/lib/accounts/AccountService'
import electronChannel from '../util/electronChannel'

const service = new AccountService()
service.serve(electronChannel)
export default service
