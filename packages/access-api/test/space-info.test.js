import * as Space from '@web3-storage/access/capabilities/space'
import assert from 'assert'
import { context } from './helpers/context.js'
import { createSpace } from './helpers/utils.js'
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
})
