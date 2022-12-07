import { IndexedDBDriver } from '../drivers/indexeddb.js'

/**
 * Store implementation for the browser.
 *
 * Usage:
 *
 * ```js
 * import { StoreIndexedDB } from '@web3-storage/access/stores/store-indexeddb'
 * ```
 *
 * @extends {IndexedDBDriver<import('../types').AgentDataExport>}
 */
export class StoreIndexedDB extends IndexedDBDriver {}
