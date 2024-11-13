/**
 * Utility to create delegations for actors in the network.
 * 
 * Usage:
 * node mkdelegate.js <private-key>
 */
import { delegate } from '@ucanto/core'
import * as ed25519 from '@ucanto/principal/ed25519'
import * as Link from 'multiformats/link'
import { identity } from 'multiformats/hashes/identity'
import { base64 } from 'multiformats/bases/base64'
import * as DID from '@ipld/dag-ucan/did'

const indexingServiceDID = 'did:web:staging.indexer.storacha.network'
const uploadServiceDID = 'did:web:staging.upload.storacha.network'
const storageProviderDID =
  'did:key:...'

if (!process.argv[2]) {
  console.error('missing private key arg')
  process.exit(1)
}

// @ts-expect-error 
const delegateIndexingServiceToUploadService = async () => {
  const issuer = ed25519.parse(process.argv[2]).withDID(indexingServiceDID)
  const audience = DID.parse(uploadServiceDID)

  const delegation = await delegate({
    issuer,
    audience,
    capabilities: [
      { can: 'assert/equals', with: issuer.did(), nb: {} },
      { can: 'assert/index', with: issuer.did(), nb: {} },
    ],
    expiration: Infinity,
  })

  console.log(await formatDelegation(delegation))
}
// delegateIndexingServiceToUploadService()

// @ts-expect-error
const delegateStorageProviderToUploadService = async () => {
  const issuer = ed25519.parse(process.argv[2])
  const audience = DID.parse(uploadServiceDID)

  const delegation = await delegate({
    issuer,
    audience,
    capabilities: [
      { can: 'blob/allocate', with: issuer.did(), nb: {} },
      { can: 'blob/accept', with: issuer.did(), nb: {} },
    ],
    expiration: Infinity,
  })

  console.log(await formatDelegation(delegation))
}
// delegateStorageProviderToUploadService()

// @ts-expect-error
const delegateIndexingServiceToStorageProvider = async () => {
  const issuer = ed25519.parse(process.argv[2]).withDID(indexingServiceDID)
  const audience = DID.parse(storageProviderDID)

  const delegation = await delegate({
    issuer,
    audience,
    capabilities: [{ can: 'claim/cache', with: issuer.did(), nb: {} }],
    expiration: Infinity,
  })

  console.log(await formatDelegation(delegation))
}
// delegateIndexingServiceToStorageProvider()

/** @param {import('@ucanto/interface').Delegation} delegation */
const formatDelegation = async (delegation) => {
  const { ok: archive, error } = await delegation.archive()
  if (error) throw error

  const digest = identity.digest(archive)
  const link = Link.create(0x0202, digest)
  return link.toString(base64)
}
