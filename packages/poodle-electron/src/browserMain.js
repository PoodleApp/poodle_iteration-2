/* @flow */

import * as React           from 'react'
import * as ReactDOM        from 'react-dom'
import injectTapEventPlugin from 'react-tap-event-plugin'
import { RootComponent }    from 'poodle-core'

// Adds support for `onTouchTap` to React components
// TODO: this should not be required both here and in `poodle-core`;
// but there may be an issue with multiple copies of React when using `yarn link`
injectTapEventPlugin()

export function main(root: Element) {
  ReactDOM.render(<RootComponent />, root)
}
