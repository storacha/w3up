import { MemoryDriver } from '../drivers/memory.js'

/**
 * Store implementation with in-memory storage
 *
 * Usage:
 *
 * ```js
 * import { StoreMemory } from '@storacha/access/stores/store-memory'
 * ```
 *
 * @extends {MemoryDriver<import('../types.js').AgentDataExport>}
 */
export class StoreMemory extends MemoryDriver {}
