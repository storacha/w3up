import { AgentData } from '@web3-storage/access/agent'
import { randomCAR } from '../helpers/random.js'
import { Client } from '../../src/client.js'
import * as Test from '../test.js'

export const BlobClient = Test.withContext({
  'should store a CAR file': async (
    assert,
    { connection, provisionsStorage, allocationsStorage }
  ) => {
    const alice = new Client(await AgentData.create(), {
      // @ts-ignore
      serviceConf: {
        access: connection,
        upload: connection,
      },
    })

    const space = await alice.createSpace('test')
    const auth = await space.createAuthorization(alice)
    await alice.addSpace(auth)
    await alice.setCurrentSpace(space.did())

    // Then we setup a billing for this account
    await provisionsStorage.put({
      // @ts-expect-error
      provider: connection.id.did(),
      account: alice.agent.did(),
      consumer: space.did(),
    })

    const car = await randomCAR(128)
    const multihash = await alice.capability.blob.add(car)

    // TODO we should blobsStorage as well
    assert.deepEqual(
      await allocationsStorage.exists(space.did(), multihash.bytes),
      {
        ok: true,
      }
    )

    assert.deepEqual(multihash, car.cid.multihash)
  },

  'should list stored CARs': async (
    assert,
    { connection, provisionsStorage }
  ) => {
    const alice = new Client(await AgentData.create(), {
      // @ts-ignore
      serviceConf: {
        access: connection,
        upload: connection,
      },
    })

    const space = await alice.createSpace('test')
    const auth = await space.createAuthorization(alice)
    await alice.addSpace(auth)
    await alice.setCurrentSpace(space.did())

    // Then we setup a billing for this account
    await provisionsStorage.put({
      // @ts-expect-error
      provider: connection.id.did(),
      account: alice.agent.did(),
      consumer: space.did(),
    })

    const car = await randomCAR(128)
    const multihash = await alice.capability.blob.add(car)
    assert.deepEqual(multihash, car.cid.multihash)

    const {
      results: [entry],
    } = await alice.capability.blob.list()

    assert.deepEqual(entry.blob.digest, car.cid.multihash.bytes)
    assert.deepEqual(entry.blob.size, car.size)
  },
  'should remove a stored CAR': async (
    assert,
    { connection, provisionsStorage }
  ) => {
    const alice = new Client(await AgentData.create(), {
      // @ts-ignore
      serviceConf: {
        access: connection,
        upload: connection,
      },
    })

    const space = await alice.createSpace('test')
    const auth = await space.createAuthorization(alice)
    await alice.addSpace(auth)
    await alice.setCurrentSpace(space.did())

    // Then we setup a billing for this account
    await provisionsStorage.put({
      // @ts-expect-error
      provider: connection.id.did(),
      account: alice.agent.did(),
      consumer: space.did(),
    })

    const car = await randomCAR(128)
    const cid = await alice.capability.blob.add(car)

    const result = await alice.capability.blob.remove(cid)
    assert.ok(result.ok)
  },
})

Test.test({ BlobClient })
