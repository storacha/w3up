import * as API from '../types.js'
import {
  alice,
  registerSpace,
  randomCAR
} from '../util.js'
import { createServer, connect } from '../../src/lib.js'

import { delegate } from '@ucanto/core'
import { Root, Upload } from '@web3-storage/capabilities'

/**
 * @type {API.Tests}
 */
export const test = {
  'root/get returns information about an uploaded CID': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({ id: context.id, channel: createServer(context) })

    const car = await randomCAR(128)
    const otherCar = await randomCAR(40)

    // invoke a upload/add with proof
    const [root] = car.roots
    const shards = [car.cid, otherCar.cid].sort()

    const uploadAdd = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root, shards },
        proofs: [proof],
      })
      .execute(connection)

    assert.ok(uploadAdd.out.ok)

    const service = context.service
    const rootGet = await Root.get
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: service.did(),
        nb: { cid: car.roots[0] },
        proofs: [
          await delegate({
            issuer: service,
            audience: alice,
            capabilities: [{ with: service.did(), can: 'root/get' }],
          }),],
      })
      .execute(connection)

    assert.ok(rootGet.out.ok, `failed to get root: ${rootGet.out.error?.message}`)
    assert.equal(rootGet.out.ok?.spaces[0].did, spaceDid)
  },
}
