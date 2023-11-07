import { IndexedDBDriver } from '../driver/indexed-db.js'

/**
 * Store implementation for the browser.
 *
 * Usage:
 *
 * ```js
 * import { StoreIndexedDB } from '@web3-storage/access/stores/store-indexeddb'
 * ```
 *
 * @extends {IndexedDBDriver<import('../types.js').AgentDataExport>}
 */
export class StoreIndexedDB extends IndexedDBDriver {}
