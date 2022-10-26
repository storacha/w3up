import { importDAG } from '@ucanto/core/delegation'
import * as Signer from '@ucanto/principal/rsa'
import defer from 'p-defer'
import { Delegations } from '../delegations.js'

/**
 * @typedef {import('./types').StoreDataKeyRsa} StoreData
 * @typedef {import('./types').StoreKeyRsa} Store
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

  /** @type {IDBDatabase|undefined} */
  #db

  /**
   * @param {string} dbName
   * @param {number} [dbVersion]
   */
  constructor(dbName, dbVersion) {
    this.#dbName = dbName
    this.#dbVersion = dbVersion
  }

  async open() {
    /** @type {import('p-defer').DeferredPromise<Store>} */
    const { resolve, reject, promise } = defer()
    const openReq = indexedDB.open(this.#dbName, this.#dbVersion)

    openReq.addEventListener('upgradeneeded', () => {
      const db = openReq.result
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
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

    const getExists = withObjectStore(db, 'readonly', async (store) => {
      /** @type {import('p-defer').DeferredPromise<boolean>} */
      const { resolve, reject, promise } = defer()

      const getReq = store.get(DATA_ID)
      getReq.addEventListener('success', () => resolve(Boolean(getReq.result)))
      getReq.addEventListener('error', () =>
        reject(new Error('failed to query DB', { cause: getReq.error }))
      )
      return promise
    })

    return await getExists()
  }

  /**
   * Creates a new, opened and initialized store.
   *
   * @param {string} dbName
   * @param {number} [dbVersion]
   */
  static async create(dbName, dbVersion) {
    const store = new StoreIndexedDB(dbName, dbVersion)
    await store.open()
    await store.init({})
    return store
  }

  /** @type {Store['init']} */
  async init(data) {
    const principal =
      data.principal || (await Signer.generate({ extractable: false }))
    const delegations = data.delegations || new Delegations({ principal })
    const storeData = {
      accounts: data.accounts || [],
      meta: data.meta || { name: 'agent', type: 'device' },
      principal,
      delegations,
    }

    await this.save(storeData)
    return storeData
  }

  /** @param {StoreData} data */
  async save(data) {
    const db = this.#db
    if (!db) throw new Error('Store is not open')

    const putData = withObjectStore(db, 'readwrite', async (store) => {
      /** @type {import('p-defer').DeferredPromise<Store>} */
      const { resolve, reject, promise } = defer()

      const putReq = store.put({
        id: DATA_ID,
        accounts: data.accounts.map((a) => a.toArchive()),
        delegations: {
          created: data.delegations.created.map((d) => [...d.export()]),
          received: data.delegations.received.map((d) => [...d.export()]),
          meta: [...data.delegations.meta.entries()],
        },
        meta: data.meta,
        principal: data.principal.toArchive(),
      })
      putReq.addEventListener('success', () => resolve(this))
      putReq.addEventListener('error', () =>
        reject(new Error('failed to query DB', { cause: putReq.error }))
      )

      return promise
    })

    return await putData()
  }

  /** @type {Store['load']} */
  async load() {
    const db = this.#db
    if (!db) throw new Error('Store is not open')

    const getData = withObjectStore(db, 'readonly', async (store) => {
      /** @type {import('p-defer').DeferredPromise<StoreData>} */
      const { resolve, reject, promise } = defer()

      const getReq = store.get(DATA_ID)
      getReq.addEventListener('success', () => {
        try {
          /** @type {import('./types').IDBStoreData} */
          const raw = getReq.result
          if (!raw) throw new Error('Store is not initialized')

          const principal = Signer.from(raw.principal)
          const data = {
            accounts: raw.accounts.map((a) => Signer.from(a)),
            delegations: new Delegations({
              principal,
              received: raw.delegations.received.map((blocks) =>
                importDAG(blocks)
              ),
              created: raw.delegations.created.map((blocks) =>
                importDAG(blocks)
              ),
              meta: new Map(raw.delegations.meta),
            }),
            meta: raw.meta,
            principal,
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
    })

    return await getData()
  }

  async createAccount() {
    return await Signer.generate({ extractable: false })
  }
}

/**
 * @template T
 * @param {IDBDatabase} db
 * @param {IDBTransactionMode} txnMode
 * @param {(s: IDBObjectStore) => Promise<T>} fn
 * @returns
 */
function withObjectStore(db, txnMode, fn) {
  return async () => {
    const tx = db.transaction(STORE_NAME, txnMode)
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
      result = await fn(tx.objectStore(STORE_NAME))
      tx.commit()
    } catch (error) {
      reject(error)
      tx.abort()
    }
    return promise
  }
}
