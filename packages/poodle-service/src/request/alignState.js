/*
 * Each IMAP request action specifies a connection state that it expects.
 * Functions in this module are responsible for manipulating an IMAP connection
 * to match the state that the action expects.
 *
 * @flow
 */

import * as imap from 'imap'
import type Connection from 'imap'
import * as promises from '../util/promises'
import * as S from './state'
import { type BoxSpecifier } from './types'

export default async function alignState (
  expectedState: S.ConnectionState,
  connection: Connection
): Promise<void> {
  await connect(connection)
  switch (expectedState.type) {
    case S.ANY:
      return
    case S.AUTHENTICATED:
      return closeBox(true, connection)
    case S.OPEN_BOX:
      return openBox(expectedState.box, expectedState.readonly, connection)
    default:
      throw new Error(`unknown IMAP connection state: ${expectedState.type}`)
  }
}

function connect (connection: Connection): Promise<void> {
  if (connection.state === 'disconnected') {
    connection.connect()
    return new Promise((resolve, reject) => {
      connection.once('ready', () => resolve())
      connection.once('error', reject)
    })
  } else {
    return Promise.resolve()
  }
}

async function openBox (
  boxSpec: BoxSpecifier,
  readonly: boolean,
  connection: Connection
): Promise<void> {
  const boxName = await getBoxName(boxSpec, connection)
  const _box = (connection: any)._box
  if (_box && _box.name === boxName && _box.readOnly == readonly) {

  } else {
    await closeBox
    await promises.lift1(cb => connection.openBox(boxName, readonly, cb))
  }
}

async function closeBox (
  autoExpunge: boolean,
  connection: Connection
): Promise<void> {
  if (connection._box) {
    await promises.lift0(cb => connection.closeBox(autoExpunge, cb))
  }
}

async function getBoxName (
  boxSpec: BoxSpecifier,
  connection: Connection
): Promise<string> {
  const { attribute, name } = (boxSpec: any)
  if (name) {
    return name
  } else if (attribute) {
    try {
      return await findBox(byAttribute(attribute), connection)
    } catch (err) {
      throw new Error(`cannot find box with attribute, ${attribute}`)
    }
  } else {
    throw new Error(`unknown box specifier: ${JSON.stringify(boxSpec)}`)
  }
}

async function findBox (
  p: (box: imap.BoxListItem, boxName: string) => boolean,
  connection: Connection
): Promise<{ name: string, box: imap.BoxListItem }> {
  const boxes = await promises.lift1(cb => connection.getBoxes(cb))
  const result = findBoxHelper(p, boxes)
  if (result) {
    return result
  } else {
    throw new Error('Box not found')
  }
}

function findBoxHelper (
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
          box.children
            ? findBoxHelper(p, box.children, name + box.delimiter)
            : null
      )
      .filter(child => !!child)[0]
  }
}

function byAttribute (attribute: string): (box: imap.BoxListItem) => boolean {
  return box => box.attribs.some(a => a === attribute)
}

// function boxByName (
//   name: string
// ): (_: imap.BoxListItem, boxName: string) => boolean {
//   return (_, boxName) => boxName === name
// }
