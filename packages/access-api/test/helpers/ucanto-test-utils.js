import * as Ucanto from '@ucanto/interface'
import { Access, Provider, Voucher } from '@web3-storage/capabilities'
import * as assert from 'assert'
import * as principal from '@ucanto/principal'
import * as delegationsResponse from '../../src/utils/delegations-response.js'
/**
 * @typedef {import('@web3-storage/access/types').Service} AccessService
 */

/**
 * Tests using context from "./helpers/context.js", which sets up a testable access-api inside miniflare.
 *
 * @template {Record<string,any>} Service
 * @template {import('./types').HelperTestContext<Service>} Context
 * @param {() => Promise<Context>} createContext
 * @param {object} [options]
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} options.account - account to register spaces with
 * @param {Iterable<Promise<Ucanto.Principal<Ucanto.DID<'key'>>>>} options.registerSpaces - spaces to register in access-api. Some access-api functionality on a space requires it to be registered.
 */
export function createTesterFromContext(createContext, options) {
  const create = () =>
    createContext().then(async (ctx) => {
      const registeredSpaceAgent = await principal.ed25519.generate()
      if (options) {
        await registerSpaces(options?.registerSpaces ?? [], {
          ...ctx,
          account: options.account,
          agent: registeredSpaceAgent,
        })
      }
      /** @type {Ucanto.ConnectionView<Service>} */
      const connection = ctx.conn
      return {
        ...ctx,
        connection,
        registeredSpaceAgent,
      }
    })
  const context = create()
  const connection = context.then(({ connection }) => connection)
  const issuer = context.then(({ issuer }) => issuer)
  const audience = context.then(({ service }) => service)
  const service = context.then(({ service }) => service)
  const miniflare = context.then(({ mf }) => mf)
  /**
   * @type {import('../../src/types/ucanto').ServiceInvoke<Service>}
   */
  const invoke = async (invocation) => {
    const { conn } = await context
    const [result] = await conn.execute(invocation)
    return result
  }
  return {
    issuer,
    audience,
    invoke,
    miniflare,
    context,
    connection,
    service,
    create,
  }
}

/**
 * @template T
 * @typedef {import('../access-delegate.test').Resolvable<T>} Resolvable
 */

/**
 * given an iterable of spaces, register them against an access-api
 * using a service-issued voucher/redeem invocation
 *
 * @param {Iterable<Resolvable<Ucanto.Principal<Ucanto.DID<'key'>>>>} spaces
 * @param {object} options
 * @param {Ucanto.Signer<Ucanto.DID<'web'>>} options.service
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} options.agent
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} options.account
 * @param {Ucanto.ConnectionView<Record<string, any>>} options.conn
 */
export async function registerSpaces(
  spaces,
  { service, conn, account, agent }
) {
  // first register account
  const request = await accountRegistrationInvocation(
    service,
    account.did(),
    agent.did(),
    service
  )
  const results = await conn.execute(request)
  assert.deepEqual(
    results.length,
    1,
    'registration invocation should have 1 result'
  )
  const [result] = results
  assertNotError(result)
  assert.ok(
    'delegations' in result,
    'registration result should have delegations'
  )
  const accountDelegations = [
    ...delegationsResponse.decode(/** @type {any} */ (result.delegations)),
  ]
  for (const spacePromise of spaces) {
    const space = await spacePromise
    const addProvider = await Provider.add
      .invoke({
        issuer: agent,
        audience: service,
        with: account.did(),
        nb: {
          consumer: space.did(),
          provider: service.did(),
        },
        proofs: [...accountDelegations],
      })
      .delegate()
    const [addProviderResult] = await conn.execute(addProvider)
    assertNotError(addProviderResult)
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
export async function spaceRegistrationInvocationVoucher(
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
 * get an access-api invocation that will register an account.
 * This is useful e.g. because some functionality (e.g. access/delegate)
 * will fail unless the space is registered.
 *
 * @param {Ucanto.Signer<Ucanto.DID>} service - issues voucher/redeem. e.g. could be the same signer as access-api env.PRIVATE_KEY
 * @param {Ucanto.DID<'mailto'>} account
 * @param {Ucanto.DID<'key'>} agent
 * @param {Ucanto.Principal} audience - audience of the invocation. often is same as issuer
 * @param {number} lifetimeInSeconds
 */
export async function accountRegistrationInvocation(
  service,
  account,
  agent,
  audience = service,
  lifetimeInSeconds = 60 * 15
) {
  const register = await Access.confirm
    .invoke({
      issuer: service,
      audience,
      with: service.did(),
      lifetimeInSeconds,
      nb: {
        iss: account,
        aud: agent,
        att: [{ can: '*' }],
      },
    })
    .delegate()
  return register
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

/**
 * @template {Ucanto.Capability} Capability
 * @template Result
 * @typedef {object} InvokeTester
 * @property {(invocation: Ucanto.Invocation<Capability>) => Promise<Result>} invoke
 * @property {Resolvable<Ucanto.Signer<Ucanto.DID<'key'>>>} issuer
 * @property {Resolvable<Ucanto.Signer<Ucanto.DID>>} audience
 */

/**
 * Tests using simple function invocation -> result
 *
 * @template {Ucanto.Capability} Capability
 * @template Result
 * @param {() => (invocation: Ucanto.Invocation<Capability>) => Promise<Result>} createHandler
 * @returns {InvokeTester<Capability, Result>}
 */
export function createTesterFromHandler(createHandler) {
  const issuer = principal.ed25519.generate()
  const audience = principal.ed25519.generate()
  /**
   * @param {Ucanto.Invocation<Capability>} invocation
   */
  const invoke = async (invocation) => {
    const handle = createHandler()
    const result = await handle(invocation)
    return result
  }
  return { issuer, audience, invoke }
}
