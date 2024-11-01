import { ConfDriver } from '../drivers/conf.js'

/**
 * Store implementation with "[conf](https://github.com/sindresorhus/conf)"
 *
 * Usage:
 *
 * ```js
 * import { StoreConf } from '@storacha/access/stores/store-conf'
 * ```
 *
 * @extends {ConfDriver<import('../types.js').AgentDataExport>}
 */
export class StoreConf extends ConfDriver {}
