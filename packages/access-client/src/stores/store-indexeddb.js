import { IndexedDBDriver } from '../drivers/indexeddb.js'

/**
 * Store implementation for the browser.
 *
 * Usage:
 *
 * ```js
 * import { StoreIndexedDB } from '@storacha/access/stores/store-indexeddb'
 * ```
 *
 * @extends {IndexedDBDriver<import('../types.js').AgentDataExport>}
 */
export class StoreIndexedDB extends IndexedDBDriver {}
