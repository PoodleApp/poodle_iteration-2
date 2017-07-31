/* @flow */

import React from 'react'
import type { StatelessComponent } from 'react-redux'

type Lifecycle = (<P>(
  c: StatelessComponent<P>
) => Class<React.Component<void, P & LifecycleProps, void>>) &
  (<Def, P, S>(
    c: Class<React.Component<Def, P, S>>
  ) => Class<React.Component<Def, P & LifecycleProps, void>>)

type LifecycleProps = {
  onWillUnmount: () => any
}

const lifecycle: Lifecycle = (WrappedComponent: *) => {
  const wrappedComponentName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  const displayName = `Lifecycle(${wrappedComponentName})`

  class Lifecycle extends React.Component<*, *, *> {
    componentWillUnmount () {
      const onWillUnmount = this.props.onWillUnmount
      onWillUnmount()
    }

    render () {
      return React.createElement(WrappedComponent, this.props)
    }
  }
  Lifecycle.displayName = displayName

  return Lifecycle
}

export default lifecycle
