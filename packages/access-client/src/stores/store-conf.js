import { ConfDriver } from '../drivers/conf.js'

/**
 * Store implementation with "[conf](https://github.com/sindresorhus/conf)"
 *
 * Usage:
 *
 * ```js
 * import { StoreConf } from '@web3-storage/access/stores/store-conf'
 * ```
 *
 * @extends {ConfDriver<import('../types').AgentDataExport>}
 */
export class StoreConf extends ConfDriver {}
