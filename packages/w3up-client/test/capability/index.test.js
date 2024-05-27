import { ShardedDAGIndex } from '@web3-storage/blob-index'
import { codec as CAR } from '@ucanto/transport/car'
import * as Link from 'multiformats/link'
import * as Result from '../../src/result.js'
import { randomCAR } from '../helpers/random.js'
import * as Test from '../test.js'
import { setupGetReceipt } from '../helpers/utils.js'
import { sha256 } from '@ucanto/server'

export const IndexClient = Test.withContext({
  add: {
    'should register an index': async (
      assert,
      { client: alice, service, provisionsStorage, uploadTable }
    ) => {
      const car = await randomCAR(128)

      const space = await alice.createSpace('test')
      const auth = await space.createAuthorization(alice)
      await alice.addSpace(auth)
      await alice.setCurrentSpace(space.did())

      // @ts-expect-error
      await provisionsStorage.put({
        provider: service.did(),
        customer: 'did:mailto:alice@web.mail',
        consumer: space.did(),
      })

      const index = ShardedDAGIndex.create(car.cid)
      const indexBytes = Result.unwrap(await index.archive())

      const bytesHash = await sha256.digest(indexBytes)
      const link = Link.create(CAR.code, bytesHash)
      const commitment = await alice.capability.blob.add(
        new Blob([indexBytes]),
        {
          fetch: setupGetReceipt(function* () {
            yield link
          }),
        }
      )

      assert.ok(
        await alice.capability.index.add(
          Link.create(
            CAR.code,
            // @ts-ignore Element
            commitment.capabilities[0].nb.content.multihash
          )
        )
      )
    },
  },
})

Test.test({ IndexClient })
