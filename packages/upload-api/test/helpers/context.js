import * as Signer from '@ucanto/principal/ed25519'
import {
  getConnection,
  getMockService,
  getStoreImplementations as getFilecoinStoreImplementations,
  getQueueImplementations as getFilecoinQueueImplementations,
} from '@web3-storage/filecoin-api/test/context/service'
import { BlobsStorage } from '../storage/blobs-storage.js'
import { CarStoreBucket } from '../storage/car-store-bucket.js'
import * as Email from '../../src/utils/email.js'
import { create as createRevocationChecker } from '../../src/utils/revocation.js'
import { createServer, connect } from '../../src/lib.js'
import * as Types from '../../src/types.js'
import * as TestTypes from '../types.js'
import { confirmConfirmationUrl } from './utils.js'
import { getServiceStorageImplementations } from '../storage/index.js'

/**
 * @param {object} options
 * @param {string[]} [options.providers]
 * @param {boolean} [options.requirePaymentPlan]
 * @param {import('http')} [options.http]
 * @param {{fail(error:unknown): unknown}} [options.assert]
 * @returns {Promise<Types.UcantoServerTestContext>}
 */
export const createContext = async (
  options = { requirePaymentPlan: false }
) => {
  const requirePaymentPlan = options.requirePaymentPlan
  const signer = await Signer.generate()
  const aggregatorSigner = await Signer.generate()
  const dealTrackerSigner = await Signer.generate()
  const id = signer.withDID('did:web:test.web3.storage')

  const service = getMockService()
  const dealTrackerConnection = getConnection(
    dealTrackerSigner,
    service
  ).connection

  const serviceStores = await getServiceStorageImplementations(options)

  /** @type {Map<string, unknown[]>} */
  const queuedMessages = new Map()
  const {
    storefront: { filecoinSubmitQueue, pieceOfferQueue },
  } = getFilecoinQueueImplementations(queuedMessages)
  const {
    storefront: { pieceStore, receiptStore, taskStore },
  } = getFilecoinStoreImplementations()
  const email = Email.debug()

  /** @type { import('../../src/types.js').UcantoServerContext } */
  const serviceContext = {
    id,
    aggregatorId: aggregatorSigner,
    signer: id,
    email,
    requirePaymentPlan,
    url: new URL('http://localhost:8787'),
    ...serviceStores,
    getServiceConnection: () => connection,
    ...createRevocationChecker({
      revocationsStorage: serviceStores.revocationsStorage,
    }),
    errorReporter: {
      catch(error) {
        if (options.assert) {
          options.assert.fail(error)
        } else {
          throw error
        }
      },
    },
    // Filecoin
    maxUploadSize: 5_000_000_000,
    filecoinSubmitQueue,
    pieceOfferQueue,
    pieceStore,
    receiptStore,
    taskStore,
    dealTrackerService: {
      connection: dealTrackerConnection,
      invocationConfig: {
        issuer: id,
        with: id.did(),
        audience: dealTrackerSigner,
      },
    },
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
    grantAccess: (mail) => confirmConfirmationUrl(connection, mail),
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
  const carStoreBucket = context.carStoreBucket
  await carStoreBucket.deactivate()

  /** @type {BlobsStorage & {  deactivate: () => Promise<void> }}} */
  // @ts-ignore type misses S3 bucket properties like accessKey
  const blobsStorage = context.blobsStorage
  await blobsStorage.deactivate()
}
