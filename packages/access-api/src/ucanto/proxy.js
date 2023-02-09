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
    const isServerError = status !== undefined && status >= 500 && status < 600
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
 */
export function createProxyHandler(options) {
  /**
   * @template {import('@ucanto/interface').Capability} Capability
   * @param {Ucanto.Invocation<Capability>} invocation
   * @param {Ucanto.InvocationContext} context
   * @returns {Promise<Ucanto.Result<any, { error: true }>>}
   */
  return async function handleInvocation(invocation, context) {
    const { connections, catchInvocationError = defaultCatchInvocationError } =
      options
    const connection =
      connections[invocation.audience.did()] ?? connections.default
    try {
      const [result] = await Client.execute(
        [await invocation.delegate()],
        connection
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
