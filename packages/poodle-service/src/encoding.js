/* @flow */

import * as libqp from 'libqp'

import type { ReadStream } from 'fs'

export function decode(encoding: string, content: ReadStream): ReadStream {
  switch (encoding) {
    case 'QUOTED-PRINTABLE': return content.pipe(new libqp.Decoder)
    default: throw new Error(`unknown encoding: ${encoding}`)
  }
}
