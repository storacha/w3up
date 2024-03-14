import * as API from '../types.js'

// We use existing name otherwise we'll loose all the data.
const STORE_NAME = 'AccessStore'
const DATA_ID = 1

/**
 * @typedef {object} Options
 * @property {string} name
 * @property {number} [version]
 * @property {string} [storeName]
 * @property {boolean} [autoOpen]
 */

/**
 * Data store that persists data in the IndexedDB.
 *
 * @example
 * ```js
 * import * as Store from '@web3-storage/w3up-client/store/indexed-db'
 * const store = Store.open({ name: 'w3access' })
 * ```
 *
 * @template Model
 * @param {Options} options
 * @returns {API.DataStore<Model>}
 */
export const open = (options) => new IndexedDBStore(options)

/**
 * @template Model
 * @implements {API.DataStore<Model>}
 */
export class IndexedDBStore {
  /** @type {string} */
  #dbName

  /** @type {number|undefined} */
  #dbVersion

  /** @type {string} */
  #dbStoreName

  /** @type {IDBDatabase|undefined} */
  #db

  /** @type {boolean} */
  #autoOpen

  /**
   * @param {Options} options
   */
  constructor(options) {
    this.#dbName = options.name
    this.#dbVersion = options.version
    this.#dbStoreName = options.storeName ?? STORE_NAME
    this.#autoOpen = options.autoOpen ?? true
  }

  /** @returns {Promise<IDBDatabase>} */
  async #getOpenDB() {
    if (!this.#db) {
      if (!this.#autoOpen) throw new Error('Store is not open')
      await this.connect()
    }
    // @ts-expect-error open sets this.#db
    return this.#db
  }

  async connect() {
    const db = this.#db
    if (db) return

    return new Promise((resolve, reject) => {
      const openReq = indexedDB.open(this.#dbName, this.#dbVersion)

      openReq.addEventListener('upgradeneeded', () => {
        const db = openReq.result
        db.createObjectStore(this.#dbStoreName, { keyPath: 'id' })
      })

      openReq.addEventListener('success', () => {
        this.#db = openReq.result
        resolve(undefined)
      })

      openReq.addEventListener('error', () => reject(openReq.error))
    })
  }

  async close() {
    const db = this.#db
    if (!db) throw new Error('Store is not open')

    db.close()
    this.#db = undefined
  }

  /** @param {Model} data */
  async save(data) {
    const db = await this.#getOpenDB()

    const putData = withObjectStore(
      db,
      'readwrite',
      this.#dbStoreName,
      async (store) =>
        new Promise((resolve, reject) => {
          const putReq = store.put({ id: DATA_ID, ...data })
          putReq.addEventListener('success', () => resolve(undefined))
          putReq.addEventListener('error', () =>
            reject(new Error('failed to query DB', { cause: putReq.error }))
          )
        })
    )

    return await putData()
  }

  async load() {
    const db = await this.#getOpenDB()

    const getData = withObjectStore(
      db,
      'readonly',
      this.#dbStoreName,
      async (store) =>
        new Promise((resolve, reject) => {
          const getReq = store.get(DATA_ID)
          getReq.addEventListener('success', () => resolve(getReq.result))
          getReq.addEventListener('error', () =>
            reject(new Error('failed to query DB', { cause: getReq.error }))
          )
        })
    )

    return await getData()
  }

  async reset() {
    const db = await this.#getOpenDB()

    const clear = withObjectStore(
      db,
      'readwrite',
      this.#dbStoreName,
      (s) =>
        new Promise((resolve, reject) => {
          const req = s.clear()
          req.addEventListener('success', () => {
            resolve(undefined)
          })

          req.addEventListener('error', () =>
            reject(new Error('failed to query DB', { cause: req.error }))
          )
        })
    )

    await clear()
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
const withObjectStore = (db, txnMode, storeName, fn) => () =>
  // eslint-disable-next-line no-async-promise-executor
  new Promise(async (resolve, reject) => {
    const tx = db.transaction(storeName, txnMode)

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
  })
