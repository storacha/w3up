import { Receipt } from '@ucanto/core'
import { conclude } from '@web3-storage/capabilities/ucan'
import * as Server from '@ucanto/server'
import { UCAN } from '@web3-storage/capabilities'
import * as HTTP from '@web3-storage/capabilities/http'
import * as W3sBlobCapabilities from '@web3-storage/capabilities/web3.storage/blob'
import { W3sBlob } from '@web3-storage/capabilities'
import * as Types from '../../src/types.js'

export const validateAuthorization = () => ({ ok: {} })

/**
 * Utility function that creates a delegation from account to agent and an
 * attestation from service to proof it. Proofs can be used to invoke any
 * capability on behalf of the account.
 *
 * @param {object} input
 * @param {Types.UCAN.Signer<Types.AccountDID>} input.account
 * @param {Types.Signer<Types.DID>} input.service
 * @param {Types.Signer} input.agent
 */
export const createAuthorization = async ({ account, agent, service }) => {
  // Issue authorization from account DID to agent DID
  const authorization = await Server.delegate({
    issuer: account,
    audience: agent,
    capabilities: [
      {
        with: 'ucan:*',
        can: '*',
      },
    ],
    expiration: Infinity,
  })

  const attest = await UCAN.attest
    .invoke({
      issuer: service,
      audience: agent,
      with: service.did(),
      nb: {
        proof: authorization.cid,
      },
      expiration: Infinity,
    })
    .delegate()

  return [authorization, attest]
}

// FIXME this code has been copied over from upload-api
/**
 * @param {import('@ucanto/interface').Signer} id
 * @param {import('@ucanto/interface').Verifier} serviceDid
 * @param {import('@ucanto/interface').Receipt} receipt
 */
function createConcludeInvocation(id, serviceDid, receipt) {
  const receiptBlocks = []
  const receiptCids = []
  for (const block of receipt.iterateIPLDBlocks()) {
    receiptBlocks.push(block)
    receiptCids.push(block.cid)
  }
  const concludeAllocatefx = conclude.invoke({
    issuer: id,
    audience: serviceDid,
    with: id.toDIDKey(),
    nb: {
      receipt: receipt.link(),
    },
    expiration: Infinity,
    facts: [
      {
        ...receiptCids,
      },
    ],
  })
  for (const block of receiptBlocks) {
    concludeAllocatefx.attach(block)
  }

  return concludeAllocatefx
}

// @ts-ignore
export const setupBlobAddResponse = async function({ issuer, with: space, proofs, audience }, invocation) {
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
    result: { ok: {} },
  })
  const blobConcludeAllocate = await createConcludeInvocation(issuer, audience, blobAllocateReceipt).delegate()

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
  const blobConcludeAccept = await createConcludeInvocation(issuer, audience, blobAcceptReceipt).delegate()

  return Server
    .ok({
      site: {
        'ucan/await': ['.out.ok.site', blobAcceptTask.link()],
      },
    })
    .fork(blobAllocateTask)
    .fork(blobConcludeAllocate)
    .fork(blobPutTask)
    .join(blobAcceptTask)
    .fork(blobConcludeAccept)
}
