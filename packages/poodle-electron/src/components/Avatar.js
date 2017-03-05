/* @flow */

import MuiAvatar   from 'material-ui/Avatar'
import * as colors from 'material-ui/styles/colors'
import React       from 'react'
import stringHash  from 'string-hash'

type Props = {
  name: string,
  id: URI,
}

type URI = string

export default function Avatar({ name, id }: Props) {
  const [color, backgroundColor] = getColors(id)
  const letter = getLetter(name)
  return <MuiAvatar color={color} backgroundColor={backgroundColor}>{letter}</MuiAvatar>
}

const primaryColors = Object.keys(colors).filter(k => k.match(/500$/))
const accentColors  = Object.keys(colors).filter(k => k.match(/A100+$/))
const primaryCount  = primaryColors.length
const accentCount   = accentColors.length

function getColors(id: URI): [string, string] {
  const f = stringHash('fg'+id)
  const b = stringHash('bg'+id)
  return [
    colors[accentColors[f % accentCount]],
    colors[primaryColors[b % primaryCount]],
  ]
}

function getLetter(name: string): string {
  return (name || '?')[0].toUpperCase()
}
