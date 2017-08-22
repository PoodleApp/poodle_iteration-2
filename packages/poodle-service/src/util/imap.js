/* @flow */

import Connection from 'imap'
import * as promises from './promises'

import type { Box, BoxList, BoxListItem } from 'imap'

export function openBox (
  boxName: string,
  readonly: boolean,
  conn: Connection
): Promise<Box> {
  return promises.lift1(cb => conn.openBox(boxName, readonly, cb))
}

// TODO: capability check for 'All' mailbox
export async function openAllMail (
  readonly: boolean,
  conn: Connection
): Promise<Box> {
  const all = await findBox('\\All', conn)
  if (all) {
    return openBox(all.name, readonly, conn)
  } else {
    throw new Error('Could not find box for all mail')
  }
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
): Promise<?{ name: string, box: BoxListItem }> {
  const matcher = nameOrAttrib.startsWith('\\')
    ? boxByAttribute(nameOrAttrib)
    : boxByName(nameOrAttrib)
  const boxes = await promises.lift1(cb => conn.getBoxes(cb))
  return findBoxByPredicate(matcher, boxes)
}

function findBoxByPredicate (
  p: (box: BoxListItem, boxName: string) => boolean,
  boxes: BoxList,
  path?: string = ''
): ?{ box: BoxListItem, name: string } {
  const pairs = Object.keys(boxes).map(k => ({ name: k, box: boxes[k] }))
  const match = pairs.find(([n, b]) => p(b, n))
  if (match) {
    const { name, box } = match
    return { name: path + name, box }
  } else {
    return pairs
      .map(
        ([n, b]) =>
          b.children ? findBoxByPredicate(p, b.children, n + b.delimiter) : null
      )
      .filter(child => !!child)[0]
  }
}

export function boxByAttribute (
  attribute: string
): (box: BoxListItem) => boolean {
  return box => box.attribs.some(a => a === attribute)
}

export function boxByName (
  name: string
): (_: BoxListItem, boxName: string) => boolean {
  return (_, boxName) => boxName === name
}
