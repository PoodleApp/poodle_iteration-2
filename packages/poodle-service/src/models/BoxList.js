/* @flow */

import * as imap from 'imap'

export function findBox (
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
            ? findBox(p, box.children, name + box.delimiter)
            : null
      )
      .filter(child => !!child)[0]
  }
}

export function byAttribute (attribute: string): (box: imap.BoxListItem) => boolean {
  return box => box.attribs.some(a => a === attribute)
}

export function byName (
  name: string
): (_: imap.BoxListItem, boxName: string) => boolean {
  return (_, boxName) => boxName === name
}
