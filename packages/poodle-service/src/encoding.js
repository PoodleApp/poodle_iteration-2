/* @flow */

import base64     from 'base64-stream'
import * as libqp from 'libqp'

import type { ReadStream } from 'fs'

export function decode(encoding: string, content: ReadStream): ReadStream {
  switch (encoding) {
    case '7BIT':             return content
    case 'BASE64':           return content.pipe(base64.decode())
    case 'QUOTED-PRINTABLE': return content.pipe(new libqp.Decoder)
    default:                 throw new Error(`unknown encoding: ${encoding}`)
  }
}
