import { AllocationsStorage } from './allocations-storage.js'
import { BlobsStorage } from './blobs-storage.js'
import { CarStoreBucket } from './car-store-bucket.js'
import { StoreTable } from './store-table.js'
import { UploadTable } from './upload-table.js'
import { DudewhereBucket } from './dude-where-bucket.js'
import { ProvisionsStorage } from './provisions-storage.js'
import { DelegationsStorage } from './delegations-storage.js'
import { RateLimitsStorage } from './rate-limits-storage.js'
import { RevocationsStorage } from './revocations-storage.js'
import { PlansStorage } from './plans-storage.js'
import { UsageStorage } from './usage-storage.js'
import { SubscriptionsStorage } from './subscriptions-storage.js'
import { TasksStorage } from './tasks-storage.js'
import { ReceiptsStorage } from './receipts-storage.js'

/**
 * @param {object} options
 * @param {string[]} [options.providers]
 * @param {boolean} [options.requirePaymentPlan]
 * @param {import('http')} [options.http]
 * @param {{fail(error:unknown): unknown}} [options.assert]
 */
export async function getServiceStorageImplementations(options) {
  const storeTable = new StoreTable()
  const allocationsStorage = new AllocationsStorage()
  const uploadTable = new UploadTable()
  const blobsStorage = await BlobsStorage.activate(options)
  const carStoreBucket = await CarStoreBucket.activate(options)
  const dudewhereBucket = new DudewhereBucket()
  const revocationsStorage = new RevocationsStorage()
  const plansStorage = new PlansStorage()
  const usageStorage = new UsageStorage(storeTable, allocationsStorage)
  const provisionsStorage = new ProvisionsStorage(options.providers)
  const subscriptionsStorage = new SubscriptionsStorage(provisionsStorage)
  const delegationsStorage = new DelegationsStorage()
  const rateLimitsStorage = new RateLimitsStorage()
  const tasksStorage = new TasksStorage()
  const receiptsStorage = new ReceiptsStorage()

  return {
    storeTable,
    allocationsStorage,
    uploadTable,
    blobsStorage,
    blobRetriever: blobsStorage,
    carStoreBucket,
    dudewhereBucket,
    revocationsStorage,
    plansStorage,
    usageStorage,
    provisionsStorage,
    subscriptionsStorage,
    delegationsStorage,
    rateLimitsStorage,
    tasksStorage,
    receiptsStorage,
  }
}
