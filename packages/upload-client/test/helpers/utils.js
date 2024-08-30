import { parseLink } from '@ucanto/server'
import * as Signer from '@ucanto/principal/ed25519'
import { Receipt } from '@ucanto/core'
import { Assert } from '@web3-storage/content-claims/capability'
import * as Server from '@ucanto/server'
import * as HTTP from '@web3-storage/capabilities/http'
import * as W3sBlobCapabilities from '@web3-storage/capabilities/web3.storage/blob'
import { W3sBlob } from '@web3-storage/capabilities'
import { createConcludeInvocation } from '../../src/blob/add.js'
import { randomCAR } from './random.js'

export const validateAuthorization = () => ({ ok: {} })

export const receiptsEndpoint = 'http://localhost:9201'
export const bucket200Endpoint = 'http://localhost:9200'
export const bucket400Endpoint = 'http://localhost:9400'
export const bucket500Endpoint = 'http://localhost:9500'

Object.entries({
  receiptsEndpoint,
  bucket200Endpoint,
  bucket400Endpoint,
  bucket500Endpoint,
}).forEach(([name, url]) => {
  fetch(url).catch((error) => {
    console.warn(
      `${name} is unreachable at ${url}. If tests are failing, try running \`pnpm --filter=@web3-storage/upload-client mock\`.`
    )
  })
})

export const setupBlobAddSuccessResponse = async function (
  // @ts-ignore
  options,
  // @ts-ignore
  invocation
) {
  return setupBlobAddResponse(
    bucket200Endpoint,
    options,
    invocation,
    false,
    false
  )
}

export const setupBlobAdd4xxResponse = async function (
  // @ts-ignore
  options,
  // @ts-ignore
  invocation
) {
  return setupBlobAddResponse(
    bucket400Endpoint,
    options,
    invocation,
    false,
    false
  )
}

export const setupBlobAdd5xxResponse = async function (
  // @ts-ignore
  options,
  // @ts-ignore
  invocation
) {
  return setupBlobAddResponse(
    bucket500Endpoint,
    options,
    invocation,
    false,
    false
  )
}

export const setupBlobAddWithAcceptReceiptSuccessResponse = async function (
  // @ts-ignore
  options,
  // @ts-ignore
  invocation
) {
  return setupBlobAddResponse(
    bucket200Endpoint,
    options,
    invocation,
    false,
    true
  )
}

export const setupBlobAddWithHttpPutReceiptSuccessResponse = async function (
  // @ts-ignore
  options,
  // @ts-ignore
  invocation
) {
  return setupBlobAddResponse(
    bucket200Endpoint,
    options,
    invocation,
    true,
    false
  )
}

/**
 * @param {string} url
 * @param {boolean} hasHttpPutReceipt
 * @param {boolean} hasAcceptReceipt
 */
const setupBlobAddResponse = async function (
  url,
  // @ts-ignore
  { issuer, with: space, proofs, audience },
  // @ts-ignore
  invocation,
  hasHttpPutReceipt,
  hasAcceptReceipt
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
  const blobPutReceipt = !hasHttpPutReceipt
    ? await Receipt.issue({
        issuer,
        ran: blobPutTask.cid,
        result: { error: new Error() },
      })
    : await generateAcceptReceipt(blobPutTask.cid.toString())
  const blobConcludePut = await createConcludeInvocation(
    issuer,
    audience,
    blobPutReceipt
  ).delegate()

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

  // FIXME not generating the right kind of receipt here, but it should be enough for mocking
  const blobAcceptReceipt = !hasAcceptReceipt
    ? await Receipt.issue({
        issuer,
        ran: blobAcceptTask.cid,
        result: { error: new Error() },
      })
    : await generateAcceptReceipt(blobAcceptTask.cid.toString())
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
    .fork(blobConcludePut)
    .fork(blobAcceptTask)
    .fork(blobConcludeAccept)
}

/**
 * @param {string} taskCid
 * @returns {Promise<import('@ucanto/interface').Receipt>}
 */
export const generateAcceptReceipt = async (taskCid) => {
  const issuer = await Signer.generate()
  const content = (await randomCAR(128)).cid
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

  return await Receipt.issue({
    issuer,
    fx: {
      fork: [locationClaim],
    },
    ran: parseLink(taskCid),
    result: {
      ok: {
        site: locationClaim.link(),
      },
    },
  })
}
