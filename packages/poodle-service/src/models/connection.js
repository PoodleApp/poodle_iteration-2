/*
 * Provide type-level bookkeeping for IMAP connection state
 *
 * @flow
 */

import ImapConnection, * as imap from 'imap'

export type Connection = ImapConnection

export type OpenBox = {
  box: imap.Box,
  connection: Connection
}
