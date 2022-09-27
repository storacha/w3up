import { createResource, InitializedResourceReturn, ResourceOptions, ResourceReturn, ResourceSource } from 'solid-js'
import { listUploads } from '@w3ui/uploads-list-core'
import { Identity } from '@w3ui/solid-wallet'
import { CID } from 'multiformats/cid'

export function createUploadsListResource (source: ResourceSource<Identity>, options?: ResourceOptions<CID[], Identity>): ResourceReturn<CID[]> | InitializedResourceReturn<CID[]> {
  return createResource<CID[], Identity>(
    source,
    async identity => { return await listUploads(identity.signingPrincipal) },
    options
  )
}
