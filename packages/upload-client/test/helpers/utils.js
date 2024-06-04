import { Receipt } from '@ucanto/core'
import * as Server from '@ucanto/server'
import * as HTTP from '@web3-storage/capabilities/http'
import * as W3sBlobCapabilities from '@web3-storage/capabilities/web3.storage/blob'
import { W3sBlob } from '@web3-storage/capabilities'
import { createConcludeInvocation } from '../../../upload-client/src/blob.js'

export const validateAuthorization = () => ({ ok: {} })

export const receiptsEndpoint = 'http://localhost:9201'

export const setupBlobAddSuccessResponse = async function (
  // @ts-ignore
  options,
  // @ts-ignore
  invocation
) {
  return setupBlobAddResponse('http://localhost:9200', options, invocation)
}

export const setupBlobAdd4xxResponse = async function (
  // @ts-ignore
  options,
  // @ts-ignore
  invocation
) {
  return setupBlobAddResponse('http://localhost:9400', options, invocation)
}

export const setupBlobAdd5xxResponse = async function (
  // @ts-ignore
  options,
  // @ts-ignore
  invocation
) {
  return setupBlobAddResponse('http://localhost:9500', options, invocation)
}

const setupBlobAddResponse = async function (
  // @ts-ignore
  url,
  // @ts-ignore
  { issuer, with: space, proofs, audience },
  // @ts-ignore
  invocation
) {
  const blob = invocation.capabilities[0].nb.blob
  const blobAllocateTask = await W3sBlob.allocate
    .invoke({
      issuer,
      audience,
      with: space.did(),
      nb: {
        blob,
        cause: invocation.link(),
        space: space.did(),
      },
      expiration: Infinity,
    })
    .delegate()
  const blobAllocateReceipt = await Receipt.issue({
    issuer,
    ran: blobAllocateTask.cid,
    result: {
      ok: {
        address: {
          url,
        },
      },
    },
  })
  const blobConcludeAllocate = await createConcludeInvocation(
    issuer,
    audience,
    blobAllocateReceipt
  ).delegate()

  const blobPutTask = await HTTP.put
    .invoke({
      issuer,
      audience,
      with: space.toDIDKey(),
      nb: {
        body: blob,
        url: {
          'ucan/await': ['.out.ok.address.url', blobAllocateTask.link()],
        },
        headers: {
          'ucan/await': ['.out.ok.address.headers', blobAllocateTask.link()],
        },
      },
      facts: [
        {
          keys: audience.toArchive(),
        },
      ],
      expiration: Infinity,
    })
    .delegate()

  const blobAcceptTask = await W3sBlobCapabilities.accept
    .invoke({
      issuer,
      audience,
      with: space.did(),
      nb: {
        blob,
        space: space.did(),
        _put: { 'ucan/await': ['.out.ok', blobPutTask.link()] },
      },
      proofs,
    })
    .delegate()

  const blobAcceptReceipt = await Receipt.issue({
    issuer,
    ran: blobAcceptTask.cid,
    result: { ok: {} },
  })
  const blobConcludeAccept = await createConcludeInvocation(
    issuer,
    audience,
    blobAcceptReceipt
  ).delegate()

  return Server.ok({
    site: {
      'ucan/await': ['.out.ok.site', blobAcceptTask.link()],
    },
  })
    .fork(blobAllocateTask)
    .fork(blobConcludeAllocate)
    .fork(blobPutTask)
    .fork(blobAcceptTask)
    .fork(blobConcludeAccept)
}
