import assert from 'assert'
import { context } from './helpers/context.js'
import { createSpace } from './helpers/utils.js'
import * as Store from '@web3-storage/capabilities/store'

describe('proxy store/ and upload/ invocations to upload-api', function () {
  it('forwards store/list invocations with aud=did:key', async function () {
    const { issuer, service, conn } = await context({
      environment: {
        ...process.env,
        PRIVATE_KEY:
          process.env.WEB3_STORAGE_PRIVATE_KEY || process.env.PRIVATE_KEY,
      },
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
    const result = await listInvocation.execute(/** @type {any} */ (conn))
    if (result?.error) {
      try {
        /**
         * This is expected to error even when the forwarding is working.
         * When this happens, the error will be like
         * InvalidAudience: Delegation audience is 'did:key:z6MkqBzPG7oNu7At8fktasQuS7QR7Tj7CujaijPMAgzdmAxD' instead of 'did:web:web3.storage'\n"
         * This makes sense because this test is just ensuring that the invocation is forwarded based on the capability.can value
         * even though the audience is just some random did:key
         */
        assert.strictEqual(
          result.name,
          'InvalidAudience',
          'error has expected name'
        )
        assert.strictEqual(
          result.message?.includes(
            `Delegation audience is '${service.did()}' instead of 'did:web:web3.storage'`
          ),
          true,
          `error includes expected message`
        )
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('unexpected error', result)
        throw error
      }
    }
  })
  it('forwards invocations with aud=did:web:web3.storage', async function () {
    const web3storageDid = 'did:web:web3.storage'
    // if this is set, it's to inject in the actual private key used by web3StorageDid.
    // and if it's present, the assertions will expect no error from the proxy or upstream
    const privateKeyFromEnv = process.env.WEB3_STORAGE_PRIVATE_KEY
    const {
      issuer,
      service: serviceSigner,
      conn,
    } = await context({
      environment: {
        ...process.env,
        // this emulates the configuration for deployed environments,
        // which will allow the access-api ucanto server to accept
        // invocations where aud=web3storageDid
        DID: web3storageDid,
        PRIVATE_KEY: privateKeyFromEnv ?? process.env.PRIVATE_KEY,
      },
    })
    const service = serviceSigner.withDID(web3storageDid)
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
      /** @type {any} */ (conn)
    )
    if (privateKeyFromEnv) {
      assert.ok(
        !result?.error,
        `result should not be an error if privateKeyFromEnv is set (be sure its set to the same key as ${web3storageDid}`
      )
    } else {
      // even if the forwarding happens ok, the result may still be an error.
      // this will happen if this context's env.signer private key is different than
      // production, which it almost surely is.
      //
      // Since there is an error, we'll assert it's the situation above
      try {
        assert.strictEqual(
          result.name,
          'Unauthorized',
          'error is expected name'
        )
        assert.strictEqual(
          result.message?.includes(
            'Claim {"can":"store/list"} is not authorized'
          ),
          true,
          `error includes expected message`
        )
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('unexpected error', result)
        throw error
      }
    }
  })
})
