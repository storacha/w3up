import * as API from '../../../types.js'
import { alice, registerSpace } from '../../../util.js'
import { createServer, connect } from '../../../../src/lib.js'

import { delegate } from '@ucanto/core'
import * as CAR from '@ucanto/transport/car'
import { Admin, Store } from '@storacha/capabilities'

/**
 * @type {API.Tests}
 */
export const test = {
  'admin/store/inspect returns information about an uploaded CID': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const link = await CAR.codec.link(data)
    const size = data.byteLength

    const storeAdd = await Store.add
      .invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: { link, size },
        proofs: [proof],
      })
      .execute(connection)

    assert.ok(storeAdd.out.ok)

    const service = context.service
    const adminStoreInspect = await Admin.store.inspect
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: service.did(),
        nb: { link },
        proofs: [
          await delegate({
            issuer: service,
            audience: alice,
            capabilities: [{ with: service.did(), can: 'admin/store/inspect' }],
          }),
        ],
      })
      .execute(connection)

    assert.ok(
      adminStoreInspect.out.ok,
      `failed to get shard: ${adminStoreInspect.out.error?.message}`
    )
    assert.equal(adminStoreInspect.out.ok?.spaces[0].did, spaceDid)
    assert.equal(
      typeof adminStoreInspect.out.ok?.spaces[0].insertedAt,
      'string'
    )
  },
}
