import { parseLink } from '@ucanto/server'
import * as Signer from '@ucanto/principal/ed25519'
import { Receipt, Message } from '@ucanto/core'
import * as CAR from '@ucanto/transport/car'
import * as Server from '@ucanto/server'
import * as HTTP from '@web3-storage/capabilities/http'
import * as W3sBlobCapabilities from '@web3-storage/capabilities/web3.storage/blob'
import { W3sBlob } from '@web3-storage/capabilities'
import { createConcludeInvocation } from '../../../upload-client/src/blob.js'
import { Assert } from '@web3-storage/content-claims/capability'

export const validateAuthorization = () => ({ ok: {} })

/**
 * @param {import('multiformats').Link} content
 */
export const setupGetReceipt = (content) => {
  // @ts-ignore Parameter
  return async (url) => {
    // need to handle using regular fetch when not actually getting a receipt
    if (!url.pathname) {
      return await fetch(url)
    }

    const taskID = url.pathname.replace('/receipt/', '')
    const issuer = await Signer.generate()

    const locationClaim = await Assert.location.delegate({
      issuer,
      audience: issuer,
      with: issuer.toDIDKey(),
      nb: {
        content,
        location: ['http://localhost'],
      },
      expiration: Infinity,
    })

    const receipt = await Receipt.issue({
      issuer,
      fx: {
        fork: [locationClaim],
      },
      ran: parseLink(taskID),
      result: {
        ok: {
          site: locationClaim.link(),
        },
      },
    })

    const message = await Message.build({
      receipts: [receipt],
    })
    const request = CAR.request.encode(message)
    return new Response(request.body.buffer)
  }
}

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
