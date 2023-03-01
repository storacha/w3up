/**
 * @param {Array<import("../types/provisions").StorageProvisionCreation>} storage
 * @returns {import("../types/provisions").StorageProvisions}
 */
export function createStorageProvisions(storage = []) {
  /** @type {import("../types/provisions").StorageProvisions['hasStorageProvider']} */
  const hasStorageProvider = (consumerId) => {
    return Boolean(storage.some(({ space }) => space === consumerId))
  }
  /** @type {import("../types/provisions").StorageProvisions['create']} */
  const create = async (storageProvision) => {
    storage.push(storageProvision)
  }
  return {
    create,
    hasStorageProvider,
  }
}
