import * as Ucanto from '@ucanto/interface'
import { Voucher } from '@web3-storage/capabilities'
import * as assert from 'assert'

/**
 * Tests using context from "./helpers/context.js", which sets up a testable access-api inside miniflare.
 *
 * @param {() => Promise<{ issuer: Ucanto.Signer<Ucanto.DID<'key'>>, service: Ucanto.Signer<Ucanto.DID>, conn: Ucanto.ConnectionView<Record<string, any>> }>} createContext
 * @param {object} [options]
 * @param {Iterable<Promise<Ucanto.Principal>>} options.registerSpaces - spaces to register in access-api. Some access-api functionality on a space requires it to be registered.
 */
export function createTesterFromContext(createContext, options) {
  const context = createContext().then(async (ctx) => {
    await registerSpaces(options?.registerSpaces ?? [], ctx.service, ctx.conn)
    return ctx
  })
  const issuer = context.then(({ issuer }) => issuer)
  const audience = context.then(({ service }) => service)
  /**
   * @template {Ucanto.Capability} Capability
   * @param {Ucanto.Invocation<Capability>} invocation
   */
  const invoke = async (invocation) => {
    const { conn } = await context
    const [result] = await conn.execute(invocation)
    return result
  }
  return { issuer, audience, invoke }
}

/**
 * @template T
 * @typedef {import('../access-delegate.test').Resolvable<T>} Resolvable
 */

/**
 * given an iterable of spaces, register them against an access-api
 * using a service-issued voucher/redeem invocation
 *
 * @param {Iterable<Resolvable<Ucanto.Principal>>} spaces
 * @param {Ucanto.Signer<Ucanto.DID>} issuer
 * @param {Ucanto.ConnectionView<Record<string, any>>} conn
 */
export async function registerSpaces(spaces, issuer, conn) {
  for (const spacePromise of spaces) {
    const space = await spacePromise
    const redeem = await spaceRegistrationInvocation(issuer, space.did())
    const results = await conn.execute(redeem)
    assert.deepEqual(
      results.length,
      1,
      'registration invocation should have 1 result'
    )
    const [result] = results
    assertNotError(result)
  }
}

/**
 * get an access-api invocation that will register a space.
 * This is useful e.g. because some functionality (e.g. access/delegate)
 * will fail unless the space is registered.
 *
 * @param {Ucanto.Signer<Ucanto.DID>} issuer - issues voucher/redeem. e.g. could be the same signer as access-api env.PRIVATE_KEY
 * @param {Ucanto.DID} space
 * @param {Ucanto.Principal} audience - audience of the invocation. often is same as issuer
 */
export async function spaceRegistrationInvocation(
  issuer,
  space,
  audience = issuer
) {
  const redeem = await Voucher.redeem
    .invoke({
      issuer,
      audience,
      with: issuer.did(),
      nb: {
        product: 'product:free',
        space,
        identity: 'mailto:someone',
      },
    })
    .delegate()
  return redeem
}

/**
 * @param {{ error?: unknown }|null} result
 * @param {string} assertionMessage
 */
export function assertNotError(
  result,
  assertionMessage = 'result is not an error'
) {
  warnOnErrorResult(result)
  if (result && 'error' in result) {
    assert.notDeepEqual(result.error, true, assertionMessage)
  }
}

/**
 * @param {{ error?: unknown }|null} result
 * @param {string} [message]
 * @param {(...loggables: any[]) => void} warn
 */
export function warnOnErrorResult(
  result,
  message = 'unexpected error result',
  // eslint-disable-next-line no-console
  warn = console.warn.bind(console)
) {
  if (result && 'error' in result && result.error) {
    warn(message, result)
  }
}
