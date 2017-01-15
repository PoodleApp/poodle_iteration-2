/* @flow */

import Connection from 'imap'
import * as promises from './promises'

import type { Box, Boxes } from 'imap'

/*
 * Recursively searches boxes on an IMAP server to find one that matches the
 * given predicate.
 */
export async function openBox(
  p: (box: Box) => boolean,
  readonly: boolean,
  conn: Connection
): Promise<Box> {
  const boxes = await promises.lift1(cb => conn.getBoxes(cb))
  const match = findBox(p, boxes)
  if (match) {
    const [path, box] = match
    return promises.lift1(cb => conn.openBox(path, readonly, cb))
  }
  else {
    return Promise.reject(new Error("Box not found"))
  }
}

// TODO: capability check for 'All' mailbox
export function openAllMail(readonly: boolean, imap: Connection): Promise<Box> {
  return openBox(boxByAttribute('\\All'), readonly, imap)
}

function findBox(p: (box: Box) => boolean, boxes: Boxes, path?: string = ''): ?[string, Box] {
  const pairs = Object.keys(boxes).map(k => [k, boxes[k]])
  const match = pairs.find(([_, b]) => p(b))
  if (match) {
    const [name, box] = match
    return [path + name, box]
  }
  else {
    return pairs.map(([n, b]) => (
      b.children ? findBox(p, b.children, n + b.delimiter) : null
    ))
    .filter(child => !!child)
    [0]
  }
}

export function boxByAttribute(attribute: string): (box: Box) => boolean {
  return box => box.attribs.some(a => a === attribute)
}
