import { ok, error } from '@ucanto/core'
import { DIDResolutionError } from '@ucanto/validator'
import * as ClaimsService from './content-claims.js'
import { StorageNode } from './storage-node.js'
import * as BlobRetriever from './blob-retriever.js'
import * as Router from './router.js'

/**
 * @param {object} config
 * @param {import('@ucanto/interface').Signer} config.serviceID
 * @param {import('node:http')} [config.http]
 */
export const getExternalServiceImplementations = async (config) => {
  /** @type {import('@ucanto/interface').PrincipalResolver} */
  let principalResolver = {}
  if (config.serviceID.did().startsWith('did:web')) {
    principalResolver.resolveDIDKey = did =>
      did === config.serviceID.did()
        ? ok(config.serviceID.toDIDKey())
        : error(new DIDResolutionError(did))
  }

  const claimsService = await ClaimsService.activate(config)
  const blobRetriever = BlobRetriever.create(claimsService)
  const storageProviders = await Promise.all([
    StorageNode.activate({ ...config, ...principalResolver, claimsService }),
    StorageNode.activate({ ...config, ...principalResolver, claimsService }),
  ])
  const router = Router.create(config.serviceID, storageProviders)
  return {
    claimsService,
    storageProviders,
    blobRetriever,
    router
  }
}
