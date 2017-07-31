/* @flow */

import * as AS from 'activitystrea.ms'
import MuiAvatar from 'material-ui/Avatar'
import * as colors from 'material-ui/styles/colors'
import * as Actor from 'poodle-core/lib/components/Actor'
import React from 'react'
import stringHash from 'string-hash'

type Props = {
  actor: ?AS.models.Object
}

type URI = string

export default function Avatar ({ actor, ...rest }: Props) {
  const id = actor ? actor.id : ''
  const displayName = (actor && actor.name) ? Actor.displayName(actor) : '?'
  const [color, backgroundColor] = getColors(id)
  const letter = getLetter(displayName)
  return (
    <MuiAvatar color={color} backgroundColor={backgroundColor} {...rest}>
      {letter}
    </MuiAvatar>
  )
}

const primaryColors = Object.keys(colors).filter(k => k.match(/500$/))
const accentColors = Object.keys(colors).filter(k => k.match(/A100+$/))
const primaryCount = primaryColors.length
const accentCount = accentColors.length

function getColors (id: URI): [string, string] {
  const f = stringHash('fg' + id)
  const b = stringHash('bg' + id)
  return [
    colors[accentColors[f % accentCount]],
    colors[primaryColors[b % primaryCount]]
  ]
}

function getLetter (name: string): string {
  return (name || '?')[0].toUpperCase()
}
