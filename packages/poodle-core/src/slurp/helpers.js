/* @flow */

import * as effects from './effects'

export function isEffect (obj: Object): boolean {
  return (
    !!obj && (obj.type === effects.SUBSCRIBE)
  )
}

export function sourceKeys (props: Object): string[] {
  return Object.keys(props).filter(key => isEffect(props[key]))
}
