// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as Client from '@ucanto/client'

const BadGatewayHTTPErrorResult = {
  /**
   * Given unknown error, detect whether it is an upstream HTTPError.
   * If so, return a result object indicating generic 'Bad Gateway'.
   * Otherwise, if error is not a bad gateway error, return undefined
   *
   * @param {unknown} error - error encountered when proxying a ucanto invocation to an upstream url
   */
  catch(error) {
    if (!error || typeof error !== 'object') {
      return
    }
    const status = 'status' in error ? Number(error.status) : undefined
    const isServerError =
      typeof status !== 'undefined' && status >= 500 && status < 600
    if (!isServerError) {
      return
    }
    return {
      error: true,
      status: 502,
      statusText: 'Bad Gateway',
      'x-proxy-error': error,
    }
  },
}

/**
 * default catchInvocationError value for createProxyHandler.
 * It catches `HTTPError` errors to an error result with status=502 and statusText='Bad Gateway'
 *
 * @param {unknown} error
 */
function defaultCatchInvocationError(error) {
  const badGatewayResult = BadGatewayHTTPErrorResult.catch(error)
  if (badGatewayResult) {
    return badGatewayResult
  }
  throw error
}

/**
 * @template {Ucanto.ConnectionView<any>} [Connection=Ucanto.ConnectionView<any>]
 * @param {object} options
 * @param {(error: unknown) => Promise<unknown>} [options.catchInvocationError] - catches any error that comes from invoking the proxy invocation on the connection. If it returns a value, that value will be the proxied invocation result.
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
    const {
      connections,
      signer,
      catchInvocationError = defaultCatchInvocationError,
    } = options
    const { audience, capabilities, expiration, notBefore } = invocationIn
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
    const proxyInvocation = Client.invoke({
      issuer: proxyInvocationIssuer,
      capability: capabilities[0],
      audience,
      proofs: [invocationIn],
      expiration,
      notBefore,
    })
    try {
      const [result] = await Client.execute(
        [proxyInvocation],
        /** @type {Client.ConnectionView<any>} */ (connection)
      )
      return result
    } catch (error) {
      if (catchInvocationError) {
        const caughtResult = await catchInvocationError(error)
        return caughtResult
      }
      throw error
    }
  }
}
