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

/*
 * Recursively searches boxes on an IMAP server to find one that matches the
 * given predicate. Returns an object where the `name` property is the qualified
 * name (includes parent box names, separated by delimiters), and the `box`
 * property provides some metadata.
 */
export async function findBox (
  nameOrAttrib: string,
  conn: Connection
): Promise<?{ name: string, box: imap.BoxListItem }> {
  const matcher = nameOrAttrib.startsWith('\\')
    ? boxByAttribute(nameOrAttrib)
    : boxByName(nameOrAttrib)
  const boxes = await promises.lift1(cb => conn.getBoxes(cb))
  return findBoxByPredicate(matcher, boxes)
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

// TODO: capability check for 'All' mailbox
export async function openAllMail (
  readonly: boolean,
  conn: Connection
): Promise<OpenBox> {
  const all = await findBox('\\All', conn)
  if (all) {
    return openBox(all.name, readonly, conn)
  } else {
    throw new Error('Could not find box for all mail')
  }
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
    () =>
      kefir.fromPromise(
        promises.lift0(cb => {
          if (connection._box) {
            connection.closeBox(cb)
          }
        })
      )
  ): any) // TODO
}

export function withAllMail<T, E, OT: kefir.Observable<T, E>> (
  connection: Connection,
  readonly: boolean,
  callback: (openBox: OpenBox) => OT
): OT {
  return (kefirUtil.ensure(
    kefir.fromPromise(openAllMail(readonly, connection)).flatMap(callback),
    () =>
      kefir.fromPromise(
        promises.lift0(cb => {
          if (connection._box) {
            connection.closeBox(cb)
          }
        })
      )
  ): any) // TODO
}

function findBoxByPredicate (
  p: (box: imap.BoxListItem, boxName: string) => boolean,
  boxes: imap.BoxList,
  path?: string = ''
): ?{ box: imap.BoxListItem, name: string } {
  const pairs = Object.keys(boxes).map(k => ({ name: k, box: boxes[k] }))
  const match = pairs.find(({ box, name }) => p(box, name))
  if (match) {
    const { name, box } = match
    return { name: path + name, box }
  } else {
    return pairs
      .map(
        ({ box, name }) =>
          box.children ? findBoxByPredicate(p, box.children, name + box.delimiter) : null
      )
      .filter(child => !!child)[0]
  }
}

export function boxByAttribute (
  attribute: string
): (box: imap.BoxListItem) => boolean {
  return box => box.attribs.some(a => a === attribute)
}

export function boxByName (
  name: string
): (_: imap.BoxListItem, boxName: string) => boolean {
  return (_, boxName) => boxName === name
}
