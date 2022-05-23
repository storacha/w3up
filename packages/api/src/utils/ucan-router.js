import * as ucans from 'ucans'

/**
 * @typedef {(input: AbilityHandlerInput, context: import('./router').RouteContext) => Promise<Response> | Response} AbilityHandler
 * @typedef {{
 * request: Request,
 * cap: ucans.Capability,
 * ucan: ucans.Chained,
 * segment: string
 * }} AbilityHandlerInput
 */

/**
 * Ucan Routes
 */
export class UcanRouter {
  /**
   *
   * @param {import('./router').RouteContext} context
   */
  constructor(context) {
    /** @type {Map<string, AbilityHandler>} */
    this.routes = new Map()
    this.context = context
  }

  /**
   *
   * @param {string} namespace
   * @param {AbilityHandler} fn
   */
  add(namespace, fn) {
    this.routes.set(namespace, fn)
  }

  /**
   *
   * @param {FetchEvent} event
   */
  async route(event) {
    const auth = event.request.headers.get('Authorization') || ''
    if (!auth.toLowerCase().startsWith('bearer ')) {
      throw new Error('bearer missing.')
    }
    const ucanEncoded = auth.slice(7)

    const ucan = await ucans.Chained.fromToken(ucanEncoded)

    if (ucan.audience() !== this.context.keypair.did()) {
      throw new Error('its not for us.')
    }

    if (ucan.attenuation().length === 1) {
      const cap = ucan.attenuation()[0]

      if (cap.can !== '*') {
        const fn = this.routes.get(cap.can.namespace)

        if (!fn) {
          throw new Error('invocation not suppported.')
        }

        const rsp = await fn(
          {
            cap,
            ucan,
            request: event.request,
            segment: cap.can.segments[0],
          },
          this.context
        )

        return rsp
      } else {
        throw new Error('no support for superuser invocations.')
      }
    } else {
      throw new Error('invocation should have 1 cap.')
    }
  }
}
