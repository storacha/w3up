import * as assert from 'assert'
import * as Signer from '@ucanto/principal/ed25519'
import { CarStoreBucket } from '../storage/car-store-bucket.js'
import { StoreTable } from '../storage/store-table.js'
import { UploadTable } from '../storage/upload-table.js'
import { DudewhereBucket } from '../storage/dude-where-bucket.js'
import { ProvisionsStorage } from '../storage/provisions-storage.js'
import { DelegationsStorage } from '../storage/delegations-storage.js'
import { RateLimitsStorage } from '../storage/rate-limits-storage.js'
import { RevocationsStorage } from '../storage/revocations-storage.js'
import * as Email from '../../src/utils/email.js'
import { createServer, connect } from '../../src/lib.js'
import * as Types from '../../src/types.js'
import * as TestTypes from '../types.js'

/**
 * @param {object} options
 * @param {string[]} [options.providers]
 * @returns {Promise<Types.UcantoServerTestContext>}
 */
export const createContext = async (options = {}) => {
  const storeTable = new StoreTable()
  const uploadTable = new UploadTable()
  const carStoreBucket = await CarStoreBucket.activate()
  const dudewhereBucket = new DudewhereBucket()
  const signer = await Signer.generate()
  const id = signer.withDID('did:web:test.web3.storage')

  /** @type { import('../../src/types.js').UcantoServerContext } */
  const serviceContext = {
    id,
    signer: id,
    email: Email.debug(),
    url: new URL('http://localhost:8787'),
    provisionsStorage: new ProvisionsStorage(options.providers),
    delegationsStorage: new DelegationsStorage(),
    rateLimitsStorage: new RateLimitsStorage(),
    revocationsStorage: new RevocationsStorage(),
    errorReporter: {
      catch(error) {
        assert.fail(error)
      },
    },
    validateAuthorization: () => ({ ok: {} }),
    maxUploadSize: 5_000_000_000,
    storeTable,
    uploadTable,
    carStoreBucket,
    dudewhereBucket,
  }

  const connection = connect({
    id: serviceContext.id,
    channel: createServer(serviceContext),
  })

  return {
    ...serviceContext,
    mail: /** @type {TestTypes.DebugEmail} */ (serviceContext.email),
    service: /** @type {TestTypes.ServiceSigner} */ (serviceContext.id),
    connection,
    testStoreTable: storeTable,
    fetch,
  }
}

/**
 *
 * @param {Types.UcantoServerTestContext} context
 */
export const cleanupContext = async (context) => {
  /** @type {CarStoreBucket & {  deactivate: () => Promise<void> }}} */
  // @ts-ignore type misses S3 bucket properties like accessKey
  const store = context.carStoreBucket

  await store.deactivate()
}
