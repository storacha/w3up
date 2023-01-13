// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as Client from '@ucanto/client'

/**
 * @template {Ucanto.Capability} C
 * @template [Success=unknown]
 * @template {{ error: true }} [Failure={error:true}]
 * @callback InvocationResponder
 * @param {Ucanto.Invocation<C>} invocationIn
 * @param {Ucanto.InvocationContext} context
 * @returns {Promise<Ucanto.Result<Success, Failure>>}
 */

/**
 * @template {Ucanto.ConnectionView<any>} [Connection=Ucanto.ConnectionView<any>]
 * @param {object} options
 * @param {{ default: Connection, [K: Ucanto.UCAN.DID]: Connection }} options.connections
 * @param {Ucanto.Signer} [options.signer]
 */
export function createProxyHandler(options) {
  /**
   * @template {import('@ucanto/interface').Capability} Capability
   * @param {Ucanto.Invocation<Capability>} invocationIn
   * @param {Ucanto.InvocationContext} context
   * @returns {Promise<Ucanto.Result<any, { error: true }>>}
   */
  return async function handleInvocation(invocationIn, context) {
    const { connections, signer } = options
    const { audience, capabilities } = invocationIn
    const connection = connections[audience.did()] ?? connections.default
    // eslint-disable-next-line unicorn/prefer-logical-operator-over-ternary, no-unneeded-ternary
    const proxyInvocationIssuer = signer
      ? // this results in a forwarded invocation, but the upstream will reject the signature
        // created using options.signer unless options.signer signs w/ the same private key as the original issuer
        // and it'd be nice to not even have to pass around `options.signer`
        signer
      : // this works, but involves lying about the issuer type (it wants a Signer but context.id is only a Verifier)
        // @todo obviate this type override via https://github.com/web3-storage/ucanto/issues/195
        /** @type {Ucanto.Signer} */ (context.id)

    const [result] = await Client.execute(
      [
        Client.invoke({
          issuer: proxyInvocationIssuer,
          capability: capabilities[0],
          audience,
          proofs: [invocationIn],
        }),
      ],
      /** @type {Client.ConnectionView<any>} */ (connection)
    )
    return result
  }
}
