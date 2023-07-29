import { MemoryDriver } from "../drivers/memory.js";

/**
 * Store implementation with in-memory storage
 *
 * Usage:
 *
 * ```js
 * import { StoreMemory } from '@web3-storage/access/stores/store-memory'
 * ```
 *
 * @extends {MemoryDriver<import('@web3-storage/access/src/types.js').AgentDataExport>}
 */
export class StoreMemory extends MemoryDriver {}
