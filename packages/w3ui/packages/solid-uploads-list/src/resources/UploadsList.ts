import { createResource, InitializedResourceReturn, ResourceOptions, ResourceReturn, ResourceSource } from 'solid-js'
import { listUploads, ListPage } from '@w3ui/uploads-list-core'
import { Identity } from '@w3ui/solid-wallet'

export function createUploadsListResource (source: ResourceSource<Identity>, options?: ResourceOptions<ListPage, Identity>): ResourceReturn<ListPage> | InitializedResourceReturn<ListPage> {
  return createResource<ListPage, Identity>(
    source,
    async identity => { return await listUploads(identity.signingPrincipal) },
    options
  )
}
