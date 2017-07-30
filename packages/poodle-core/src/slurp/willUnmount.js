/* @flow */

import React from 'react'
import type { StatelessComponent } from 'react-redux'

type WillUnmount = (<P>(
  callback: () => any
) => (c: StatelessComponent<P>) => Class<React.Component<void, P, void>>) &
  (<Def, P, S>(
    callback: () => any
  ) => (
    c: Class<React.Component<Def, P, S>>
  ) => Class<React.Component<Def, P, void>>)

const willUnmount: WillUnmount = (callback: *) => (WrappedComponent: *) => {
  const wrappedComponentName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  const displayName = `WillUnmount(${wrappedComponentName})`

  class WillUnmount extends React.Component<*, *, *> {
    componentWillUnmount () {
      callback()
    }

    render () {
      return React.createElement(WrappedComponent, this.props)
    }
  }
  WillUnmount.displayName = displayName

  return WillUnmount
}

export default willUnmount
