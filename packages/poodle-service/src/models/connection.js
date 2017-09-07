/*
 * Provide type-level bookkeeping for IMAP connection state
 *
 * @flow
 */

import ImapConnection, * as imap from 'imap'
import * as kefir from 'kefir'
import * as kefirUtil from '../util/kefir'
import * as promises from '../util/promises'

export type Connection = ImapConnection

export type OpenBox = {
  box: imap.Box,
  connection: Connection
}

export async function openBox (
  boxName: string,
  readonly: boolean,
  connection: Connection
): Promise<OpenBox> {
  const box = await promises.lift1(cb =>
    connection.openBox(boxName, readonly, cb)
  )
  return { box, connection }
}

export async function closeBox (
  autoExpunge: boolean,
  openBox: OpenBox
): Promise<Connection> {
  await promises.lift0(cb => openBox.connection.closeBox(autoExpunge, cb))
  return openBox.connection
}

export function withBox<T, E, OT: kefir.Observable<T, E>> (
  boxName: string,
  connection: Connection,
  readonly: boolean,
  callback: (openBox: OpenBox) => OT
): OT {
  return (kefirUtil.ensure(
    kefir.fromPromise(openBox(boxName, readonly, connection)).flatMap(callback),
    () => kefir.fromPromise(promises.lift0(cb => connection.closeBox(cb)))
  ): any) // TODO
}
