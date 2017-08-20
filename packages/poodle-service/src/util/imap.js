/* @flow */

import Connection from 'imap'
import * as promises from './promises'

import type { Box, BoxList, BoxListItem } from 'imap'

/*
 * Recursively searches boxes on an IMAP server to find one that matches the
 * given predicate.
 */
export async function openBox (
  nameOrAttrib: string,
  readonly: boolean,
  conn: Connection
): Promise<Box> {
  const matcher = nameOrAttrib.startsWith('\\')
    ? boxByAttribute(nameOrAttrib)
    : boxByName(nameOrAttrib)
  const boxes = await promises.lift1(cb => conn.getBoxes(cb))
  const match = findBox(matcher, boxes)
  if (match) {
    const [path, box] = match
    return promises.lift1(cb => conn.openBox(path, readonly, cb))
  } else {
    return Promise.reject(new Error('Box not found'))
  }
}

// TODO: capability check for 'All' mailbox
export function openAllMail (readonly: boolean, imap: Connection): Promise<Box> {
  return openBox('\\All', readonly, imap)
}

function findBox (
  p: (box: BoxListItem, boxName: string) => boolean,
  boxes: BoxList,
  path?: string = ''
): ?[string, BoxListItem] {
  const pairs = Object.keys(boxes).map(k => [k, boxes[k]])
  const match = pairs.find(([n, b]) => p(b, n))
  if (match) {
    const [name, box] = match
    return [path + name, box]
  } else {
    return pairs
      .map(
        ([n, b]) =>
          b.children ? findBox(p, b.children, n + b.delimiter) : null
      )
      .filter(child => !!child)[0]
  }
}

export function boxByAttribute (attribute: string): (box: BoxListItem) => boolean {
  return box => box.attribs.some(a => a === attribute)
}

export function boxByName (name: string): (_: BoxListItem, boxName: string) => boolean {
  return (_, boxName) => boxName === name
}
