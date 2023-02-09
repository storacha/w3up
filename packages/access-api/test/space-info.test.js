import * as Space from '@web3-storage/capabilities/space'
import assert from 'assert'
import { context } from './helpers/context.js'
import { createSpace } from './helpers/utils.js'
import { parseLink } from '@ucanto/core'
import * as Store from '@web3-storage/capabilities/store'
import * as Upload from '@web3-storage/capabilities/upload'
// @ts-ignore
import isSubset from 'is-subset'

describe('space/info', function () {
  /** @type {Awaited<ReturnType<typeof context>>} */
  let ctx
  beforeEach(async function () {
    ctx = await context()
  })

  it('should fail before registering space', async function () {
    const { issuer, service, conn } = ctx

    const inv = await Space.info
      .invoke({
        issuer,
        audience: service,
        with: issuer.did(),
      })
      .execute(conn)

    if (inv?.error) {
      assert.deepEqual(inv.message, `Space not found.`)
      const expectedErrorName = 'SpaceUnknown'
      assert.deepEqual(
        'name' in inv && inv.name,
        expectedErrorName,
        `error result has name ${expectedErrorName}`
      )
    } else {
      assert.fail()
    }
  })

  it('should return space info', async function () {
    const { issuer, service, conn } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      conn,
      'space-info@dag.house'
    )

    const inv = await Space.info
      .invoke({
        issuer,
        audience: service,
        with: space.did(),
        proofs: [delegation],
      })
      .execute(conn)

    if (inv?.error) {
      assert.fail()
    } else {
      assert.ok(
        isSubset(inv, {
          did: space.did(),
          agent: issuer.did(),
          email: 'space-info@dag.house',
          product: 'product:free',
          metadata: {
            space: { name: 'name-space-info@dag.house' },
            agent: {
              url: 'https://dag.house',
              name: 'testing-agent',
              type: 'device',
              image: 'https://dag.house/logo.jpg',
              description: 'testing',
            },
          },
        })
      )
    }
  })

  it('should return space info with store/add as proof', async function () {
    const { issuer, service, conn } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      conn,
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
              link: parseLink('bafkqaaa'),
            },
          }),
        ],
      })
      .execute(conn)

    if (inv?.error) {
      assert.fail(inv.message)
    } else {
      assert.deepEqual(inv.did, space.did())
    }
  })

  it('should return space info with store/list as proof', async function () {
    const { issuer, service, conn } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      conn,
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
      .execute(conn)

    if (inv?.error) {
      assert.fail(inv.message)
    } else {
      assert.deepEqual(inv.did, space.did())
    }
  })

  it('should return space info with store/remove as proof', async function () {
    const { issuer, service, conn } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      conn,
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
              link: parseLink('bafkqaaa'),
            },
          }),
        ],
      })
      .execute(conn)

    if (inv?.error) {
      assert.fail(inv.message)
    } else {
      assert.deepEqual(inv.did, space.did())
    }
  })

  it('should return space info with upload/add as proof', async function () {
    const { issuer, service, conn } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      conn,
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
      .execute(conn)

    if (inv?.error) {
      assert.fail(inv.message)
    } else {
      assert.deepEqual(inv.did, space.did())
    }
  })

  it('should return space info with upload/list as proof', async function () {
    const { issuer, service, conn } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      conn,
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
      .execute(conn)

    if (inv?.error) {
      assert.fail(inv.message)
    } else {
      assert.deepEqual(inv.did, space.did())
    }
  })

  it('should return space info with upload/remove as proof', async function () {
    const { issuer, service, conn } = ctx

    const { space, delegation } = await createSpace(
      issuer,
      service,
      conn,
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
      .execute(conn)

    if (inv?.error) {
      assert.fail(inv.message)
    } else {
      assert.deepEqual(inv.did, space.did())
    }
  })
})
