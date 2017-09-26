/* @flow */

import React from 'react'
import Snackbar from 'material-ui/Snackbar'

type Props = {
  errors: ?(Error[]),
  onDismiss: (index: number) => any
}

export default function Errors({ errors, onDismiss }: Props) {
  const bars = (errors || []).map((error, index) => 
    <Snackbar
      open={true}
      message={error.message}
      action="dismiss"
      onTouchTap={() => onDismiss(index)}
      onRequestClose={() => onDismiss(index)}
      key={index}
    />
  )
  return <div>{bars}</div>
}
