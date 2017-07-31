/* @flow */

export function isEffect (obj: Object): boolean {
  return (
    !!obj && (obj.type === 'slurp/observable' || obj.type === 'slurp/promise')
  )
}

export function sourceKeys (props: Object): string[] {
  return Object.keys(props).filter(key => isEffect(props[key]))
}
