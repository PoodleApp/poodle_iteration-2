/* @flow */

export function lift0<T> (fn: (cb: (err: any) => void) => any): Promise<void> {
  return new Promise((resolve, reject) => {
    fn((err, value) => {
      if (err) {
        reject(err)
      } else {
        resolve(undefined)
      }
    })
  })
}

export function lift1<T> (
  fn: (cb: (err: any, value: T) => void) => any
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, value) => {
      if (err) {
        reject(err)
      } else {
        resolve(value)
      }
    })
  })
}

export async function failOnUndefined<T> (
  p: Promise<T>
): Promise<$NonMaybeType<T>> {
  const result = await p
  if (typeof result === 'undefined') {
    throw new Error('undefined result')
  }
  return result
}
