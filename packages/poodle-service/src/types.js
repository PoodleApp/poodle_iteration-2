/* @flow */

import type Connection from 'imap'

export type ConnectionFactory = () => Promise<Connection>
