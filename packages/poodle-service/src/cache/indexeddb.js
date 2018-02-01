/* @flow */

import * as kefir from 'kefir'

declare class IDBVersionChangeEvent extends Event {
  +oldVersion: number,
  +newVersion?: number
}

export type DB = IDBDatabase
export type Migration = (db: IDBDatabase) => mixed
export type Migrations = Migration[]

export const indexedDB: IDBFactory =
  window.indexedDB ||
  window.mozIndexedDB ||
  window.webkitIndexedDB ||
  window.msIndexedDB

export const IDBTransaction: Class<IDBTransaction> =
  window.IDBTransaction ||
  window.webkitIDBTransaction ||
  window.msIDBTransaction

export const IDBKeyRange: Class<IDBKeyRange> =
  window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange

export function requestDb (opts: {
  name: string,
  migrations: Migrations
}): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const { name, migrations } = opts
    const version = migrations.length // the first migration represents version `1`
    const request = indexedDB.open(name, version)
    request.onsuccess = event => resolve(event.target.result)
    request.onerror = reject // TODO: process error result? type of error result?
    request.onupgradeneeded = event => {
      const db = event.target.result
      db.onerror = reject // This is intended to catch errors from migrations
      const { oldVersion, newVersion } = event
      try {
        applyMigrations(oldVersion, newVersion, migrations, db)
      } catch (err) {
        request.transaction.abort()
        return reject(err)
      }
    }
  })
}

// A database is initialized with version `0`, so the first migration
// reperesents version `1`.
function applyMigrations (
  oldVersion: number,
  newVersion: ?number,
  migrations: Migration[],
  db: IDBDatabase
) {
  if (typeof newVersion !== 'number') {
    return
  }
  const ms = migrations.slice(oldVersion - 1, newVersion)
  for (const m of ms) {
    m(db)
  }
}

export function transaction<R> (
  db: IDBDatabase,
  storeNames: string[],
  mode: 'readonly' | 'readwrite',
  fn: (...stores: IDBObjectStore[]) => Promise<R> // TODO: use `$TupleMap` to check arity
): Promise<R> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode)
    tx.onabort = () => reject(tx.error)
    tx.onerror = () => reject(tx.error)

    const stores = storeNames.map(s => tx.objectStore(s))
    try {
      const result = fn.apply(null, stores)
      result.then(resolve)
    } catch (err) {
      reject(err)
      tx.abort()
    }
  })
}

// Transaction based on kefir Observable
export function txStream<R> (
  db: IDBDatabase,
  storeNames: string[],
  mode: 'readonly' | 'readwrite',
  fn: (...stores: IDBObjectStore[]) => kefir.Observable<R> // TODO: use `$TupleMap` to check arity
): kefir.Observable<R> {
  const tx = db.transaction(storeNames, mode)
  const txEvents = kefir.stream(emitter => {
    tx.onabort = () => {
      emitter.error(tx.error)
      emitter.end()
    }
    tx.oncomplete = emitter.end
    tx.onerror = () => {
      emitter.error(tx.error)
      emitter.end
    }
    return function onUnsubscribe () {}
  })

  const stores = storeNames.map(s => tx.objectStore(s))
  try {
    const result = fn.apply(null, stores)
    return result.merge(txEvents)
  } catch (err) {
    tx.abort()
    return txEvents.merge(kefir.constantError(err))
  }
}

export function toPromise<T> (request: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error)
    request.onsuccess = event => resolve(event.target.result)
  })
}

export function get<T> (store: IDBObjectStore, key: any): Promise<T> {
  return toPromise(store.get(key))
}

export async function maybeGet<T> (
  store: IDBObjectStore,
  key: any
): Promise<?T> {
  try {
    return toPromise(store.get(key))
  } catch (err) {
    debugger // TODO: what did we get here?
    return undefined
  }
}

export function add<T> (store: IDBObjectStore, data: T): Promise<void> {
  return toPromise(store.add(data))
}

export function put<T> (store: IDBObjectStore, data: T): Promise<void> {
  return toPromise(store.put(data))
}

export async function update<T: Object> (
  store: IDBObjectStore,
  fn: (existing: ?T) => T
): Promise<T> {
  const record = fn()
  const key = getKey(store.keyPath, record)
  const existing = await maybeGet(store, key)
  const updatedRecord = existing ? fn(existing) : record
  await put(store, updatedRecord)
  return updatedRecord
}

// TODO: handle array keypaths
function getKey<T: Object, K> (keyPath: string, value: T): K {
  const keyParts = keyPath.split('.')
  const key = keyParts.reduce((k, part) => k[part], value)
  return (key: any)
}

export function query<K, T> (
  store: IDBObjectStore,
  indexName: string,
  keyRange: IDBKeyRange,
  direction?: IDBDirection
): kefir.Observable<{ key: K, value: T }, Error> {
  const cursor = store.index(indexName).openCursor(keyRange, direction)
  return kefir.stream(emitter => {
    let alive = true
    cursor.onsuccess = event => {
      const c = event.target.result
      if (c) {
        emitter.emit({ key: c.key, value: c.value })
        if (alive) {
          c.continue()
        }
      }
      else {
        emitter.end()
      }
    }
    return function onUnsubscribe () {
      alive = false
    }
  })
}

type Count =
  & ((store: IDBObjectStore, keyRange: IDBKeyRange) => Promise<number>)
  & ((store: IDBObjectStore, index: string, keyRange: IDBKeyRange) => Promise<number>)

export const count: Count = (store, index, keyRange) => {
  if (arguments.length < 3) {
    keyRange = index
    return toPromise(store.count(keyRange))
  } else {
    return toPromise(store.index(index).count(keyRange))
  }
}
