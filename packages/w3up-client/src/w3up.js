import * as API from './types.js'
import * as Agent from './agent.js'
import * as Task from './task.js'

export * from './types.js'
export { DB, Connection, ephemeral } from './agent.js'

/**
 * Generic function that will either {@link create}, {@link load} or
 * {@link open} an agent session based on the provided `source`.
 *
 * @template {API.UnknownProtocol} Protocol
 * @param {API.W3UpFrom<Protocol>} source
 */
export const from = (source) =>
  Task.spawn(function* () {
    if (source.create) {
      return yield* create(source.create)
    } else if (source.load) {
      return yield* load(source.load)
    } else if (source.open) {
      return yield* open(source.open)
    } else {
      return Task.fail(new TypeError('Invalid source'))
    }
  })

/**
 * Restores an agent session from the specified store or creates a new on if
 * none is stored. If `as` signer is provided it will be used as signing
 * principal instead of one stored in the store. If `as` signer is not
 * provided and no signing key material is persisted in the store, a new
 * keypair will be generated and persisted in store. Provided `connection`
 * will be used to invoke capabilities on a remote (service) agent.
 *
 * @example
 * ```js
 * import * as W3Up from '@web3-storage/w3up-client'
 *
 * const demo = async () => {
 *    const session = await W3Up.open({
 *      store: new W3Up.Store.open({ name: 'w3up-client-demo' })
 *   })
 * }
 * ```
 *
 * @template {API.UnknownProtocol} Protocol
 * @param {API.W3UpOpen<Protocol>} source
 */
export const open = (source) =>
  Task.spawn(function* () {
    const agent = yield* Agent.open(source)
    return agent.connect(source.connection)
  })

/**
 * Loads an agent session from the specified store. If no agent information is
 * stored in the store, operation will fail. Optionally, `as` signing principal
 * can be provided to override the one in persisted in the store. Provided
 * `connection` will be used to invoke capabilities on a remote (service) agent.
 *
 * ⚠️ Please note that this function will fail if no agent information is stored
 * in the store. If that is not the desired behavior, consider using {@link open}
 * instead which will load agent information from the store when available and
 * otherwise generate one and persist it in the store.
 *
 * @example
 * ```js
 * import * as W3Up from '@web3-storage/w3up-client'
 *
 * const demo = async () => {
 *    const session = await W3Up.load({
 *      store: new W3Up.Store.open({ name: 'w3up-client-demo' })
 *   })
 * }
 * ```
 *
 * @template {API.UnknownProtocol} Protocol
 * @param {API.W3UpLoad<Protocol>} source
 */
export const load = (source) =>
  Task.spawn(function* () {
    const agent = yield* Agent.load(source)
    return agent.connect(source.connection)
  })

/**
 * Creates a new agent session and persists it in the specified store. If `as`
 * singing principal is provided it will be used but will not be persisted in
 * the store. If no signing principal is provided a new keypair will be generated
 * and persisted in the store. Provided `connection` will be used to invoke
 * capabilities on a remote (service) agent.
 *
 * ⚠️ Please note that this function will overwrite any existing agent session
 * already present in the store. If that is not the desired behavior, consider
 * using {@link open} instead which will only create a new agent if one is not
 * already stored.
 *
 * @example
 * ```js
 * import * as W3Up from '@web3-storage/w3up-client'
 *
 * const demo = async () => {
 *    const session = await W3Up.create({
 *      store: new W3Up.Store.open({ name: 'w3up-client-demo' })
 *   })
 * }
 * ```
 *
 * @template {API.UnknownProtocol} Protocol
 * @param {API.W3UpCreate<Protocol>} source
 */
export const create = (source) =>
  Task.spawn(function* () {
    const agent = yield* Agent.create(source)
    return agent.connect(source.connection)
  })
