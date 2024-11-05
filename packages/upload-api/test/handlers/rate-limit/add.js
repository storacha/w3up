import * as API from '../../types.js'
import { alice, bob } from '../../helpers/utils.js'
import { Absentee } from '@ucanto/principal'
import { delegate } from '@ucanto/core'
import { Access, RateLimit, SpaceBlob } from '@storacha/capabilities'
import * as CAR from '@ucanto/transport/car'
import * as DidMailto from '@storacha/did-mailto'

/**
 * @type {API.Tests}
 */
export const test = {
  'rate-limit/add can be invoked': async (assert, context) => {
    const { service, agent, space, connection } = await setup(context)

    const result = await RateLimit.add
      .invoke({
        issuer: agent,
        audience: service,
        with: service.did(),
        nb: {
          subject: space.did(),
          rate: 0,
        },
        proofs: [
          await delegate({
            issuer: service,
            audience: agent,
            capabilities: [{ with: service.did(), can: 'rate-limit/add' }],
          }),
        ],
      })
      .execute(connection)

    assert.ok(result.out.ok)
  },

  'rate-limit/add creates a listable rate limit': async (assert, context) => {
    const { service, agent, space, connection } = await setup(context)

    const result = await RateLimit.add
      .invoke({
        issuer: agent,
        audience: service,
        with: service.did(),
        nb: {
          subject: space.did(),
          rate: 0,
        },
        proofs: [
          await delegate({
            issuer: service,
            audience: agent,
            capabilities: [{ with: service.did(), can: 'rate-limit/add' }],
          }),
        ],
      })
      .execute(connection)

    assert.ok(result.out.ok)

    const listResult = await RateLimit.list
      .invoke({
        issuer: agent,
        audience: service,
        with: service.did(),
        nb: {
          subject: space.did(),
        },
        proofs: [
          await delegate({
            issuer: service,
            audience: agent,
            capabilities: [{ with: service.did(), can: 'rate-limit/list' }],
          }),
        ],
      })
      .execute(connection)

    assert.ok(result.out.ok)
    assert.equal(listResult.out.ok?.limits.length, 1)
    assert.equal(listResult.out.ok?.limits[0].id, result.out.ok?.id)
  },

  'rate-limit/add can be used to block space allocation': async (
    assert,
    context
  ) => {
    const { service, agent, space, connection } = await setup(context)

    const result = await RateLimit.add
      .invoke({
        issuer: agent,
        audience: service,
        with: service.did(),
        nb: {
          subject: space.did(),
          rate: 0,
        },
        proofs: [
          await delegate({
            issuer: service,
            audience: agent,
            capabilities: [{ with: service.did(), can: 'rate-limit/add' }],
          }),
        ],
      })
      .execute(connection)

    assert.ok(result.out.ok)

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const link = await CAR.codec.link(data)
    const size = data.byteLength
    const storeResult = await SpaceBlob.add
      .invoke({
        issuer: agent,
        audience: service,
        with: space.did(),
        nb: { blob: { digest: link.multihash.bytes, size } },
        proofs: [
          await delegate({
            issuer: space,
            audience: agent,
            capabilities: [{ with: space.did(), can: SpaceBlob.add.can }],
          }),
        ],
      })
      .execute(connection)

    assert.ok(storeResult.out.error)
    assert.equal(storeResult.out.error?.name, 'InsufficientStorage')
    assert.equal(storeResult.out.error?.message, `${space.did()} is blocked`)
  },

  'rate-limit/add can be used to block authorization by email address': async (
    assert,
    context
  ) => {
    const { service, agent, account, connection } = await setup(context)

    // ensure the account can normally be authorized
    const okAccessResult = await Access.authorize
      .invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
        nb: {
          iss: account.did(),
          att: [{ can: '*' }],
        },
      })
      .execute(connection)

    assert.ok(okAccessResult.out.ok)

    // block the account's email address
    const email = DidMailto.toEmail(DidMailto.fromString(account.did()))
    const blockResult = await RateLimit.add
      .invoke({
        issuer: agent,
        audience: service,
        with: service.did(),
        nb: {
          subject: email,
          rate: 0,
        },
        proofs: [
          await delegate({
            issuer: service,
            audience: agent,
            capabilities: [{ with: service.did(), can: 'rate-limit/add' }],
          }),
        ],
      })
      .execute(connection)

    assert.ok(blockResult.out.ok)

    // verify the account is blocked
    const errorAccessResult = await Access.authorize
      .invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
        nb: {
          iss: account.did(),
          att: [{ can: '*' }],
        },
        nonce: 'second-try',
      })
      .execute(connection)

    assert.equal(errorAccessResult.out.error?.name, 'AccountBlocked')
  },

  'rate-limit/add can be used to block authorization by domain': async (
    assert,
    context
  ) => {
    const { service, agent, account, connection } = await setup(context)

    // ensure the account can normally be authorized
    const okAccessResult = await Access.authorize
      .invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
        nb: {
          iss: account.did(),
          att: [{ can: '*' }],
        },
      })
      .execute(connection)

    assert.ok(okAccessResult.out.ok)

    // block the account's domain
    const domain = DidMailto.toEmail(DidMailto.fromString(account.did())).split(
      '@'
    )[1]
    const blockResult = await RateLimit.add
      .invoke({
        issuer: agent,
        audience: service,
        with: service.did(),
        nb: {
          subject: domain,
          rate: 0,
        },
        proofs: [
          await delegate({
            issuer: service,
            audience: agent,
            capabilities: [{ with: service.did(), can: 'rate-limit/add' }],
          }),
        ],
      })
      .execute(connection)

    assert.ok(blockResult.out.ok)

    // verify the account is blocked
    const errorAccessResult = await Access.authorize
      .invoke({
        issuer: agent,
        audience: service,
        with: agent.did(),
        nb: {
          iss: account.did(),
          att: [{ can: '*' }],
        },
        nonce: 'errorAccessResult',
      })
      .execute(connection)

    assert.equal(errorAccessResult.out.error?.name, 'AccountBlocked')
  },
}

/**
 * @param {API.TestContext} context
 */
const setup = async (context) => {
  const space = alice
  const account = Absentee.from({ id: 'did:mailto:web.mail:alice' })
  const agent = bob

  return { space, account, agent, ...context }
}
