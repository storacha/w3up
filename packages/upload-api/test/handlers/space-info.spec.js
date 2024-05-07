import * as Space from '@web3-storage/capabilities/space'
import assert from 'assert'
import { cleanupContext, createContext } from '../helpers/context.js'
import { createSpace } from '../helpers/utils.js'
import { parseLink } from '@ucanto/core'
import * as principal from '@ucanto/principal'
import * as Store from '@web3-storage/capabilities/store'
import * as Upload from '@web3-storage/capabilities/upload'

// @ts-ignore
import isSubset from 'is-subset'

describe('space/info', function () {
  /** @type {import('../types.js').UcantoServerTestContext} */
  let ctx
  beforeEach(async function () {
    ctx = await createContext()
  })
  this.afterEach(async function () {
    await cleanupContext(ctx)
  })

  it('should fail before registering space', async function () {
    const space = await principal.ed25519.generate()

    const { service, connection } = ctx

    const inv = await Space.info
      .invoke({
        issuer: space,
        audience: service,
        with: space.did(),
      })
      .execute(connection)

    if (inv.out.error) {
      assert.deepEqual(inv.out.error.message, `Space not found.`)
      const expectedErrorName = 'SpaceUnknown'
      assert.deepEqual(
        inv.out.error.name,
        expectedErrorName,
        `error result has name ${expectedErrorName}`
      )
    } else {
      assert.fail()
    }
  })

  it('should return space info', async function () {
    const { signer: issuer, service, connection } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      connection,
      'space-info@dag.house'
    )

    const inv = await Space.info
      .invoke({
        issuer,
        audience: service,
        with: space.did(),
        proofs: [delegation],
      })
      .execute(connection)

    if (inv.out.error) {
      assert.fail(inv.out.error.message)
    } else {
      assert.equal(inv.out.ok.did, space.did())
      assert.deepEqual(inv.out.ok.providers, [service.did()])
    }
  })

  it('should return space info with store/add as proof', async function () {
    const { signer: issuer, service, connection } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      connection,
      'space-info@dag.house'
    )

    const inv = await Space.info
      .invoke({
        issuer,
        audience: service,
        with: space.did(),
        proofs: [
          await Store.add.delegate({
            audience: issuer,
            issuer: space,
            with: space.did(),
            proofs: [delegation],
            nb: {
              size: 1000,
              link: parseLink(
                'bagbaierale63ypabqutmxxbz3qg2yzcp2xhz2yairorogfptwdd5n4lsz5xa'
              ),
            },
          }),
        ],
      })
      .execute(connection)

    if (inv.out.error) {
      assert.fail(inv.out.error.message)
    } else {
      assert.deepEqual(inv.out.ok.did, space.did())
    }
  })

  it('should return space info with store/list as proof', async function () {
    const { signer: issuer, service, connection } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      connection,
      'space-info@dag.house'
    )

    const inv = await Space.info
      .invoke({
        issuer,
        audience: service,
        with: space.did(),
        proofs: [
          await Store.list.delegate({
            audience: issuer,
            issuer: space,
            with: space.did(),
            proofs: [delegation],
          }),
        ],
      })
      .execute(connection)

    if (inv.out.error) {
      assert.fail(inv.out.error.message)
    } else {
      assert.deepEqual(inv.out.ok.did, space.did())
    }
  })

  it('should return space info with store/remove as proof', async function () {
    const { signer: issuer, service, connection } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      connection,
      'space-info@dag.house'
    )

    const inv = await Space.info
      .invoke({
        issuer,
        audience: service,
        with: space.did(),
        proofs: [
          await Store.remove.delegate({
            audience: issuer,
            issuer: space,
            with: space.did(),
            proofs: [delegation],
            nb: {
              link: parseLink(
                'bagbaierale63ypabqutmxxbz3qg2yzcp2xhz2yairorogfptwdd5n4lsz5xa'
              ),
            },
          }),
        ],
      })
      .execute(connection)

    if (inv.out.error) {
      assert.fail(inv.out.error.message)
    } else {
      assert.deepEqual(inv.out.ok.did, space.did())
    }
  })

  it('should return space info with upload/add as proof', async function () {
    const { signer: issuer, service, connection } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      connection,
      'space-info@dag.house'
    )

    const inv = await Space.info
      .invoke({
        issuer,
        audience: service,
        with: space.did(),
        proofs: [
          await Upload.add.delegate({
            audience: issuer,
            issuer: space,
            with: space.did(),
            proofs: [delegation],
            nb: {
              root: parseLink('bafkqaaa'),
            },
          }),
        ],
      })
      .execute(connection)

    if (inv.out.error) {
      assert.fail(inv.out.error.message)
    } else {
      assert.deepEqual(inv.out.ok.did, space.did())
    }
  })

  it('should return space info with upload/list as proof', async function () {
    const { signer: issuer, service, connection } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      connection,
      'space-info@dag.house'
    )

    const inv = await Space.info
      .invoke({
        issuer,
        audience: service,
        with: space.did(),
        proofs: [
          await Upload.list.delegate({
            audience: issuer,
            issuer: space,
            with: space.did(),
            proofs: [delegation],
          }),
        ],
      })
      .execute(connection)

    if (inv.out.error) {
      assert.fail(inv.out.error.message)
    } else {
      assert.deepEqual(inv.out.ok.did, space.did())
    }
  })

  it('should return space info with upload/remove as proof', async function () {
    const { signer: issuer, service, connection } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      connection,
      'space-info@dag.house'
    )

    const inv = await Space.info
      .invoke({
        issuer,
        audience: service,
        with: space.did(),
        proofs: [
          await Upload.remove.delegate({
            audience: issuer,
            issuer: space,
            with: space.did(),
            proofs: [delegation],
            nb: {
              root: parseLink('bafkqaaa'),
            },
          }),
        ],
      })
      .execute(connection)

    if (inv.out.error) {
      assert.fail(inv.out.error.message)
    } else {
      assert.deepEqual(inv.out.ok.did, space.did())
    }
  })
})
