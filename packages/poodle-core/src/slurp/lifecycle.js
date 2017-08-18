/* @flow */

import * as React from 'react'

type LifecycleProps = {
  onWillUnmount: () => any
}

function lifecycle<P>(WrappedComponent: React.ComponentType<P>): Class<React.Component<P>> {
  const wrappedComponentName =
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  const displayName = `Lifecycle(${String(wrappedComponentName)})`

  class Lifecycle extends React.Component<*> {
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
