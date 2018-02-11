/* @flow */

export function mapToJson<K, V> (map: Map<K, V>): [[K, V]] {
  return ([...map]: any)
}

export function jsonToMap<K, V> (serializedMap: [[K, V]]): Map<K, V> {
  return new Map(serializedMap)
}
