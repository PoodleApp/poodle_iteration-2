/* @flow */

import { type Content } from 'arfe/lib/compose'
import fileReaderStream from 'filereader-stream'

// `contentFromFile` bridges a gap between the DOM `File` API and the Node
// streams API
export default function contentFromFile (file: File): Content {
  return {
    mediaType: file.type,
    stream: fileReaderStream(file)
  }
}
