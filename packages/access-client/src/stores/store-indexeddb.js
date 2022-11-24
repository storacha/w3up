import { importDAG } from '@ucanto/core/delegation'
import * as Signer from '@ucanto/principal/rsa'
import defer from 'p-defer'

/**
 * @typedef {import('../types').AgentData<Signer.RSASigner>} StoreData
 * @typedef {import('./types').IStore<Signer.RSASigner>} Store
 */

const STORE_NAME = 'AccessStore'
const DATA_ID = 1

/**
 * Store implementation for the browser.
 *
 * @implements {Store}
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
   *
   * @returns {Promise<Store>}
   */
  async open() {
    /** @type {import('p-defer').DeferredPromise<Store>} */
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

  async exists() {
    const db = this.#db
    if (!db) throw new Error('Store is not open')

    const getExists = withObjectStore(
      db,
      'readonly',
      this.#dbStoreName,
      async (store) => {
        /** @type {import('p-defer').DeferredPromise<boolean>} */
        const { resolve, reject, promise } = defer()

        const getReq = store.get(DATA_ID)
        getReq.addEventListener('success', () =>
          resolve(Boolean(getReq.result))
        )
        getReq.addEventListener('error', () =>
          reject(new Error('failed to query DB', { cause: getReq.error }))
        )
        return promise
      }
    )

    return await getExists()
  }

  /**
   * Creates a new, opened and initialized store.
   *
   * @param {string} dbName
   * @param {object} [options]
   * @param {number} [options.dbVersion]
   * @param {string} [options.dbStoreName]
   * @returns {Promise<Store>}
   */
  static async create(dbName, options) {
    const store = new StoreIndexedDB(dbName, options)
    await store.open()
    const exists = await store.exists()
    if (!exists) {
      await store.init({})
    }
    return store
  }

  /** @type {Store['init']} */
  async init(data) {
    /** @type {StoreData} */
    const storeData = {
      meta: data.meta || { name: 'agent', type: 'device' },
      principal:
        data.principal || (await Signer.generate({ extractable: false })),
      spaces: data.spaces || new Map(),
      delegations: data.delegations || new Map(),
      currentSpace: data.currentSpace,
    }

    await this.save(storeData)
    return storeData
  }

  /**
   * @param {StoreData} data
   * @returns {Promise<Store>}
   */
  async save(data) {
    const db = this.#db
    if (!db) throw new Error('Store is not open')

    const putData = withObjectStore(
      db,
      'readwrite',
      this.#dbStoreName,
      async (store) => {
        /** @type {import('p-defer').DeferredPromise<Store>} */
        const { resolve, reject, promise } = defer()

        const dels = []

        for (const [key, value] of data.delegations) {
          dels.push([
            key,
            {
              meta: value.meta,
              delegation: [...value.delegation.export()],
            },
          ])
        }
        const putReq = store.put({
          id: DATA_ID,
          meta: data.meta,
          principal: data.principal.toArchive(),
          currentSpace: data.currentSpace,
          spaces: data.spaces,
          delegations: dels,
        })
        putReq.addEventListener('success', () => resolve(this))
        putReq.addEventListener('error', () =>
          reject(new Error('failed to query DB', { cause: putReq.error }))
        )

        return promise
      }
    )

    return await putData()
  }

  /** @type {Store['load']} */
  async load() {
    const db = this.#db
    if (!db) throw new Error('Store is not open')

    const getData = withObjectStore(
      db,
      'readonly',
      this.#dbStoreName,
      async (store) => {
        /** @type {import('p-defer').DeferredPromise<StoreData>} */
        const { resolve, reject, promise } = defer()

        const getReq = store.get(DATA_ID)
        getReq.addEventListener('success', () => {
          try {
            /** @type {import('./types').StoreDataIDB} */
            const raw = getReq.result
            if (!raw) throw new Error('Store is not initialized')

            /** @type {StoreData['delegations']} */
            const dels = new Map()

            for (const [key, value] of raw.delegations) {
              dels.set(key, {
                delegation: importDAG(value.delegation),
                meta: value.meta,
              })
            }

            /** @type {StoreData} */
            const data = {
              meta: raw.meta,
              principal: Signer.from(raw.principal),
              currentSpace: raw.currentSpace,
              spaces: raw.spaces,
              delegations: dels,
            }
            resolve(data)
          } catch (error) {
            reject(error)
          }
        })
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
