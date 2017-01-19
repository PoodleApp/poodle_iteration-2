/* @flow */

import * as React           from 'react'
import * as ReactDOM        from 'react-dom'
import { RootComponent }    from 'poodle-core'

export function main(root: Element) {
  ReactDOM.render(<RootComponent />, root)
}
