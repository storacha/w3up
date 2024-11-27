import http from 'node:http'
import { Client } from '@web3-storage/w3up-client'
import { AgentData } from '@web3-storage/access'
import * as Link from 'multiformats/link'
import { Message } from '@ucanto/core'
import * as CAR from '@ucanto/transport/car'
import * as Test from './test.js'
import { randomBytes } from './helpers/random.js'

/** @param {import('@storacha/upload-api').AgentStore} agentStore */
const createReceiptsServer = (agentStore) =>
  http.createServer(async (req, res) => {
    const task = Link.parse(req.url?.split('/').pop() ?? '')
    const receiptGet = await agentStore.receipts.get(task)
    if (receiptGet.error) {
      res.writeHead(404)
      return res.end()
    }
    const message = await Message.build({ receipts: [receiptGet.ok] })
    const request = CAR.request.encode(message)
    res.writeHead(200)
    res.end(request.body)
  })

/** @type {Test.Suite} */
export const testLegacyCompatibility = {
  uploadFile: Test.withContext({
    'should upload a file to the service via legacy client': async (
      assert,
      { connection, provisionsStorage, agentStore }
    ) => {
      const receiptsServer = createReceiptsServer(agentStore)
      const receiptsEndpoint = await new Promise((resolve) => {
        receiptsServer.listen(() => {
          // @ts-expect-error
          resolve(new URL(`http://127.0.0.1:${receiptsServer.address().port}`))
        })
      })

      try {
        const bytes = await randomBytes(128)
        const file = new Blob([bytes])
        const alice = new Client(await AgentData.create(), {
          // @ts-expect-error service no longer implements `store/*`
          serviceConf: { access: connection, upload: connection },
          receiptsEndpoint,
        })

        const space = await alice.createSpace('upload-test')
        const auth = await space.createAuthorization(alice)
        await alice.addSpace(auth)
        await alice.setCurrentSpace(space.did())

        await provisionsStorage.put({
          // @ts-expect-error
          provider: connection.id.did(),
          account: alice.agent.did(),
          consumer: space.did(),
        })

        await assert.doesNotReject(alice.uploadFile(file))
      } finally {
        receiptsServer.close()
      }
    },
  }),
}

Test.test({ LegacyCompatibility: testLegacyCompatibility })
