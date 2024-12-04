import { AgentData } from '@web3-storage/access/agent'
import { randomCAR } from '../helpers/random.js'
import { Client } from '../../src/client.js'
import * as Test from '../test.js'

export const StoreClient = Test.withContext({
  'should store a CAR file': async (
    assert,
    { connection, provisionsStorage, storeTable }
  ) => {
    const alice = new Client(await AgentData.create(), {
      // @ts-ignore
      serviceConf: {
        access: connection,
        upload: connection,
      },
    })

    const space = await alice.createSpace('test', {
      skipGatewayAuthorization: true,
    })
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
    const carCID = await alice.capability.store.add(car)

    assert.deepEqual(await storeTable.exists(space.did(), car.cid), {
      ok: true,
    })

    assert.equal(carCID.toString(), car.cid.toString())
  },

  'should list stored CARs': async (
    assert,
    { connection, provisionsStorage, storeTable }
  ) => {
    const alice = new Client(await AgentData.create(), {
      // @ts-ignore
      serviceConf: {
        access: connection,
        upload: connection,
      },
    })

    const space = await alice.createSpace('test', {
      skipGatewayAuthorization: true,
    })
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
    const carCID = await alice.capability.store.add(car)
    assert.deepEqual(carCID, car.cid)

    const {
      results: [entry],
    } = await alice.capability.store.list()

    assert.deepEqual(entry.link, car.cid)
    assert.deepEqual(entry.size, car.size)
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

    const space = await alice.createSpace('test', {
      skipGatewayAuthorization: true,
    })
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
    const cid = await alice.capability.store.add(car)

    const result = await alice.capability.store.remove(cid)
    assert.ok(result.ok)
  },

  'should get a stored item': async (
    assert,
    { connection, provisionsStorage }
  ) => {
    const car = await randomCAR(128)

    const alice = new Client(await AgentData.create(), {
      // @ts-ignore
      serviceConf: {
        access: connection,
        upload: connection,
      },
    })

    const space = await alice.createSpace('test', {
      skipGatewayAuthorization: true,
    })
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

    const cid = await alice.capability.store.add(car)
    assert.deepEqual(cid, car.cid)

    const result = await alice.capability.store.get(car.cid)

    assert.equal(result.link.toString(), car.cid.toString())
    assert.equal(result.size, car.size)
  },
})

Test.test({ StoreClient })
