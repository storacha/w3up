import assert from 'assert'
import { context } from './helpers/context.js'
import { createSpace } from './helpers/utils.js'
import * as Store from '@web3-storage/capabilities/store'
import * as ed25519 from '@ucanto/principal/ed25519'
import * as ucanto from '@ucanto/core'
import * as nodeHttp from 'node:http'
import {
  createMockUploadApiServer,
  serverLocalUrl,
  ucantoServerNodeListener,
} from './helpers/upload-api.js'

describe('proxy store/list invocations to upload-api', function () {
  for (const web3storageDid of /** @type {const} */ ([
    'did:web:test.web3.storage',
  ])) {
    it(`forwards invocations with aud=${web3storageDid}`, async function () {
      const mockUpstream = createMockUploadApiServer({
        // eslint-disable-next-line unicorn/no-await-expression-member
        id: (await ed25519.generate()).withDID(
          ucanto.DID.parse(web3storageDid).did()
        ),
      })
      const mockUpstreamHttp = nodeHttp.createServer(
        ucantoServerNodeListener(mockUpstream)
      )
      await new Promise((resolve, reject) =>
        // eslint-disable-next-line unicorn/no-useless-undefined
        mockUpstreamHttp.listen(0, () => resolve(undefined))
      )
      // now mockUpstreamHttp is listening on a port. If something goes wrong, we will close the server to have it stop litening
      after(() => {
        mockUpstreamHttp.close()
      })
      // @ts-ignore (in practice address() is always an object, and will throw if not)
      const mockUpstreamUrl = serverLocalUrl(mockUpstreamHttp.address())
      // if this is set, it's to inject in the actual private key used by web3StorageDid.
      // and if it's present, the assertions will expect no error from the proxy or upstream
      const privateKeyFromEnv = process.env.WEB3_STORAGE_PRIVATE_KEY
      const { issuer, service, conn } = await context({
        // this emulates the configuration for deployed environments,
        // which will allow the access-api ucanto server to accept
        // invocations where aud=web3storageDid
        DID: web3storageDid,
        // @ts-ignore
        PRIVATE_KEY: privateKeyFromEnv ?? process.env.PRIVATE_KEY,
        UPLOAD_API_URL: mockUpstreamUrl.toString(),
      })
      const spaceCreation = await createSpace(
        issuer,
        service,
        conn,
        'space-info@dag.house'
      )
      const listInvocation = Store.list.invoke({
        issuer,
        audience: service,
        proofs: [spaceCreation.delegation],
        with: spaceCreation.space.did(),
        nb: {},
      })
      const result = await listInvocation.execute(
        // cast to `any` only because this `conn` uses Service type from access-client.
        /** @type {import('@ucanto/interface').ConnectionView<any>} */ (conn)
      )
      assert.ok(!result?.error, 'should not be an error')
    })
  }

  it('errors when a bad delegation is given as proof', async () => {
    const mockUpstream = createMockUploadApiServer({
      // eslint-disable-next-line unicorn/no-await-expression-member
      id: await ed25519.generate(),
    })
    const mockUpstreamHttp = nodeHttp.createServer(
      ucantoServerNodeListener(mockUpstream)
    )
    await new Promise((resolve, reject) =>
      // eslint-disable-next-line unicorn/no-useless-undefined
      mockUpstreamHttp.listen(0, () => resolve(undefined))
    )
    // now mockUpstreamHttp is listening on a port. If something goes wrong, we will close the server to have it stop litening
    after(() => {
      mockUpstreamHttp.close()
    })
    const mockUpstreamUrl = serverLocalUrl(mockUpstreamHttp.address())
    const [alice, bob, mallory] = await Promise.all(
      Array.from({ length: 3 }).map(() => ed25519.Signer.generate())
    )
    const { service: serviceSigner, conn } = await context({
      UPLOAD_API_URL: mockUpstreamUrl.toString(),
    })
    const service = process.env.DID
      ? serviceSigner.withDID(ucanto.DID.parse(process.env.DID).did())
      : serviceSigner
    const spaceCreation = await createSpace(
      alice,
      service,
      conn,
      'space-info@dag.house'
    )
    /**
     * @type {Array<{
     * invocation: import('@ucanto/interface').IssuedInvocationView
     * resultAssertion: (r: import('@ucanto/interface').Result<unknown, { error: true }>) => void
     * }>} */
    const cases = [
      {
        invocation: Store.list.invoke({
          issuer: mallory,
          audience: service,
          proofs: [
            // this shouldn't work because the audience is bob,
            // but its a proof an an invocation issued by mallory
            await Store.list.delegate({
              issuer: alice,
              audience: bob,
              with: spaceCreation.space.did(),
            }),
          ],
          with: spaceCreation.space.did(),
          nb: {},
        }),
        resultAssertion(result) {
          assert.ok(result.error, 'result is an error')
          assert.ok('name' in result, 'result has a name')
          assert.equal(result.name, 'InvalidAudience')
          assert.ok(
            'stack' in result && typeof result.stack === 'string',
            'result has stack string'
          )
        },
      },
    ]
    for (const { invocation, resultAssertion } of cases) {
      const result = await invocation.execute(
        /** @type {import('@ucanto/interface').ConnectionView<any>} */ (conn)
      )
      try {
        resultAssertion(result)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('result failed assertion', result)
        throw error
      }
    }
  })
})
