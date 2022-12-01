import defer from 'p-defer'

/**
 * @template T
 * @typedef {import('./types').IStore<T>} Store
 */

const STORE_NAME = 'AccessStore'
const DATA_ID = 1

/**
 * Store implementation for the browser.
 *
 * @template T
 * @implements {Store<T>}
 */
export class StoreIndexedDB {
  /** @type {string} */
  #dbName

  /** @type {number|undefined} */
  #dbVersion

  /** @type {string} */
  #dbStoreName

  /** @type {IDBDatabase|undefined} */
  #db

  /**
   * @param {string} dbName
   * @param {object} [options]
   * @param {number} [options.dbVersion]
   * @param {string} [options.dbStoreName]
   */
  constructor(dbName, options = {}) {
    this.#dbName = dbName
    this.#dbVersion = options.dbVersion
    this.#dbStoreName = options.dbStoreName ?? STORE_NAME
  }

  /**
   * @returns {Promise<Store<T>>}
   */
  async open() {
    const db = this.#db
    if (db) return this

    /** @type {import('p-defer').DeferredPromise<Store<T>>} */
    const { resolve, reject, promise } = defer()
    const openReq = indexedDB.open(this.#dbName, this.#dbVersion)

    openReq.addEventListener('upgradeneeded', () => {
      const db = openReq.result
      db.createObjectStore(this.#dbStoreName, { keyPath: 'id' })
    })

    openReq.addEventListener('success', () => {
      this.#db = openReq.result
      resolve(this)
    })

    openReq.addEventListener('error', () => reject(openReq.error))

    return promise
  }

  async close() {
    const db = this.#db
    if (!db) throw new Error('Store is not open')

    db.close()
    this.#db = undefined
  }

  /**
   * @param {T} data
   * @returns {Promise<Store<T>>}
   */
  async save(data) {
    const db = this.#db
    if (!db) throw new Error('Store is not open')

    const putData = withObjectStore(
      db,
      'readwrite',
      this.#dbStoreName,
      async (store) => {
        /** @type {import('p-defer').DeferredPromise<Store<T>>} */
        const { resolve, reject, promise } = defer()
        const putReq = store.put({ id: DATA_ID, ...data })
        putReq.addEventListener('success', () => resolve(this))
        putReq.addEventListener('error', () =>
          reject(new Error('failed to query DB', { cause: putReq.error }))
        )

        return promise
      }
    )

    return await putData()
  }

  async load() {
    const db = this.#db
    if (!db) throw new Error('Store is not open')

    const getData = withObjectStore(
      db,
      'readonly',
      this.#dbStoreName,
      async (store) => {
        /** @type {import('p-defer').DeferredPromise<T>} */
        const { resolve, reject, promise } = defer()

        const getReq = store.get(DATA_ID)
        getReq.addEventListener('success', () => resolve(getReq.result))
        getReq.addEventListener('error', () =>
          reject(new Error('failed to query DB', { cause: getReq.error }))
        )

        return promise
      }
    )

    return await getData()
  }

  async reset() {
    if (this.#db) {
      withObjectStore(this.#db, 'readwrite', this.#dbStoreName, (s) => {
        /** @type {import('p-defer').DeferredPromise<void>} */
        const { resolve, reject, promise } = defer()
        const req = s.clear()
        req.addEventListener('success', () => {
          resolve()
        })

        req.addEventListener('error', () =>
          reject(new Error('failed to query DB', { cause: req.error }))
        )

        return promise
      })
    }
  }
}

/**
 * @template T
 * @param {IDBDatabase} db
 * @param {IDBTransactionMode} txnMode
 * @param {string} storeName
 * @param {(s: IDBObjectStore) => Promise<T>} fn
 * @returns
 */
function withObjectStore(db, txnMode, storeName, fn) {
  return async () => {
    const tx = db.transaction(storeName, txnMode)
    /** @type {import('p-defer').DeferredPromise<T>} */
    const { resolve, reject, promise } = defer()
    /** @type {T} */
    let result
    tx.addEventListener('complete', () => resolve(result))
    tx.addEventListener('abort', () =>
      reject(tx.error || new Error('transaction aborted'))
    )
    tx.addEventListener('error', () =>
      reject(new Error('transaction error', { cause: tx.error }))
    )
    try {
      result = await fn(tx.objectStore(storeName))
      tx.commit()
    } catch (error) {
      reject(error)
      tx.abort()
    }
    return promise
  }
}
