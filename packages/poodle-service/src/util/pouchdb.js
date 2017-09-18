/* @flow */

import deepEqual from 'deep-equal'
import type PouchDB from 'pouchdb-node'

type DesignDocument = {
  _id: string,
  _rev?: string,
  filters?: { [key: string]: Code },
  views?: { [key: string]: View },
  language?: string
}

type View = {
  map: Code,
  reduce?: Code
}

type Code = string

/*
 * Create a design document, or replace an existing document if its views are
 * not identical.
 */
export async function createDesignDocument (
  db: PouchDB,
  doc: DesignDocument
): Promise<void> {
  if (!doc._id.startsWith('_design/')) {
    throw new Error('design document name must begin with "design/"')
  }
  const existing = await maybeGet(db, doc._id)
  if (
    existing &&
    deepEqual(existing.views, doc.views) &&
    deepEqual(existing.filters, doc.filters)
  ) {
    return
  }
  const update = existing ? { ...doc, _rev: existing._rev } : doc
  await db.put(update)
}

/*
 * Fetch a document, but resolve to `undefined` if the document does not exist
 */
export async function maybeGet<T: Object> (
  db: PouchDB,
  id: string
): Promise<?T> {
  try {
    return await db.get(id)
  } catch (err) {
    if (err.status !== 404) {
      throw err
    }
  }
}

/*
 * Attempts to create a new document, then falls back to updating. Retries in
 * case of revision conflict.
 */
export async function update<T: { _id: string, _rev?: string }> (
  db: PouchDB,
  fn: (existing: ?T) => T,
  retries: number = 3
): Promise<T> {
  const record = fn()
  return updateHelper(db, record, fn, retries)
}

async function updateHelper<T: { _id: string, _rev?: string }> (
  db: PouchDB,
  record: T,
  fn: (existing: ?T) => T,
  retries,
  retriesRemaining = retries
): Promise<T> {
  if (retries < 0) {
    throw new Error('Retry count must be non-negative')
  }
  try {
    await db.put(record)
    return record
  } catch (err) {
    if (err.status === 409 && retries > 0) {
      // conflict
      const existing = await maybeGet(db, record._id)
      const updatedRecord = fn(existing)
      if (existing) {
        updatedRecord._rev = existing._rev
      }
      if (existing && deepEqual(existing, updatedRecord)) {
        return existing
      } else {
        await randomDelay(100, retries - retriesRemaining)
        return updateHelper(
          db,
          updatedRecord,
          fn,
          retries,
          retriesRemaining - 1
        )
      }
    } else {
      throw err
    }
  }
}

function randomDelay (maxInMillis: number, multiplier: number): Promise<void> {
  return new Promise(resolve => {
    const delay = Math.floor(Math.random() * maxInMillis) * multiplier
    setTimeout(resolve, delay)
  })
}
