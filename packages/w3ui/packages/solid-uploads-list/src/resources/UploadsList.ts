import type { InitializedResourceReturn, ResourceOptions, ResourceReturn, ResourceSource } from 'solid-js'
import type { Space } from '@w3ui/keyring-core'
import type { ServiceConfig, ListResponse, UploadListResult } from '@w3ui/uploads-list-core'
import type { Capability, Proof, Signer } from '@ucanto/interface'

import { createResource } from 'solid-js'
import { list } from '@w3ui/uploads-list-core'
import { list as uploadList } from '@web3-storage/capabilities/upload'

interface UploadsListSource extends ServiceConfig {
  cursor?: string
  size?: number
  space: Space
  agent: Signer
  getProofs: (caps: Capability[]) => Promise<Proof[]>
}

/**
 * Create a solid resource configured to fetch data from the service. Please
 * see the docs for [`createResource`](https://www.solidjs.com/docs/latest/api#createresource)
 * for parameter and return type descriptions.
 */
export function createUploadsListResource (source: ResourceSource<UploadsListSource>, options?: ResourceOptions<ListResponse<UploadListResult>, UploadsListSource>): ResourceReturn<ListResponse<UploadListResult>> | InitializedResourceReturn<ListResponse<UploadListResult>> {
  return createResource<ListResponse<UploadListResult>, UploadsListSource>(
    source,
    async ({ cursor, size, space, agent, servicePrincipal, connection, getProofs }) => {
      const conf = {
        issuer: agent,
        with: space.did(),
        audience: servicePrincipal,
        proofs: await getProofs([{ can: uploadList.can, with: space.did() }])
      }
      return await list(conf, { cursor, size, connection })
    },
    options
  )
}
