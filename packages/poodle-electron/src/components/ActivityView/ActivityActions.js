/* @flow */

import { List, ListItem } from 'material-ui/List'
import React              from 'react'
import * as helpers       from './helpers'

import type { ActivityViewProps  } from './types'

export default function ActivityActions(props: ActivityViewProps) {
  const { activity, dispatch } = props

  return <List subheader='Actions'>
    <ListItem
      primaryText='Edit'
      onTouchTap={onEdit}
      />
    <ListItem
      primaryText='Permalink'
      onTouchTap={onShowLink}
      />
    <ListItem
      primaryText='View revisions'
      />
  </List>

  function onEdit() {
    if (helpers.editing(props, activity)) {
      // TODO
      // dispatch(new CE.Reset())
    }
    else {
      // TODO
      // dispatch(new CE.Edit(activity))
    }
  }

  function onShowLink() {
    // TODO
    // dispatch(new Ev.ShowLink(activity))
  }
}
