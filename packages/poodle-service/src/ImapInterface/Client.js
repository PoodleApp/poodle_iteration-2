/*
 * Functions to send requests to an ImapInterface over some channel.
 *
 * @flow
 */

import Message from 'arfe/lib/models/Message'
import type EventEmitter from 'events'
import * as imap from 'imap'
import * as capabilities from '../capabilities'
import { request } from './channel'
import * as tasks from './tasks'

export function fetchMessagePart (
  box: string,
  msg: Message,
  partID: string,
): Promise<Readable> {

}

export function search (box: string, criteria: mixed[], channel: EventEmitter): Promise<imap.UID[]> {
  return request(tasks.search(box, criteria), channel)
}

export function gmailSearch (box: string, query: string): Promise<imap.UID[]> {
  return search(box, [['X-GM-RAW', query]], [capabilities.googleExtensions])
}
