/* @flow */

import Drawer   from 'material-ui/Drawer'
import MenuItem from 'material-ui/MenuItem'
import React    from 'react'

type Props = {}

export function ChannelListSidebar(props: Props) {
  return <Drawer open={true}>
    <MenuItem>Channel</MenuItem>
  </Drawer>
}

export default ChannelListSidebar
