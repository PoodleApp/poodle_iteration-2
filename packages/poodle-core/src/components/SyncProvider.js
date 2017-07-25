/* @flow */

import Sync from 'poodle-service/lib/sync'
import PropTypes from 'prop-types'
import React from 'react'

type Props = {
  children: any,
  sync: Sync
}

class SyncProvider extends React.Component<void, Props, void> {
  getChildContext () {
    return this.props.sync
  }

  render () {
    return React.Children.only(this.props.children)
  }
}

SyncProvider.childContextTypes = {
  sync: PropTypes.object.isRequired
}

export default SyncProvider
