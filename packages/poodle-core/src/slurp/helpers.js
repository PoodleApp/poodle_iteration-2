/* @flow */

export function isObservable (obj: Object): boolean {
  return !!obj && typeof obj.observe === 'function'
}

export function sourceKeys (props: Object): string[] {
  return Object.keys(props).filter(key => isObservable(props[key]))
}
