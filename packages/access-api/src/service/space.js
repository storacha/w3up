import { Space } from '@web3-storage/capabilities'
import { DID, fail } from '@ucanto/validator'
import {
  delegationToString,
  stringToDelegation,
} from '@web3-storage/access/encoding'
import * as Provider from '@ucanto/server'
import * as API from '../api.js'

/**
 * @param {API.Input<Space.info>} input
 * @param {API.RouteContext} ctx
 * @returns {Promise<API.Result<{ did: API.SpaceDID }, API.Failure>>}
 */
export const info = async ({ capability }, ctx) => {
  const { provisions, spaces } = ctx.models

  const spaceDid = capability.with
  if (!DID.match({ method: 'key' }).is(spaceDid)) {
    /** @type {API.SpaceUnknown} */
    const unexpectedSpaceDidFailure = {
      name: 'SpaceUnknown',
      message: `can only get info for did:key spaces`,
    }
    return {
      error: unexpectedSpaceDidFailure,
    }
  }

  const result = await provisions.hasStorageProvider(spaceDid)
  if (result.ok) {
    return {
      ok: { did: spaceDid },
    }
  }

  // this only exists if the space was registered via voucher/redeem
  const space = await spaces.get(capability.with)
  if (!space) {
    /** @type {import('@web3-storage/access/types').SpaceUnknown} */
    const spaceUnknownFailure = {
      name: 'SpaceUnknown',
      message: `Space not found.`,
    }
    return {
      error: spaceUnknownFailure,
    }
  }

  return { ok: space }
}

/**
 * @param {API.Input<Space.recover>} input
 * @param {API.RouteContext} ctx
 * @returns {Promise<API.Result<string[], API.Failure>>}
 */
export const recover = async ({ capability, invocation }, ctx) => {
  if (capability.with !== ctx.signer.did()) {
    return fail(
      `Resource ${
        capability.with
      } does not match service did ${ctx.signer.did()}`
    )
  }
  const spaces = await ctx.models.spaces.getByEmail(capability.nb.identity)
  if (!spaces) {
    return fail(`No delegations found for ${capability.nb.identity}`)
  }
  const results = []
  for (const { delegation, metadata } of spaces) {
    if (delegation) {
      const proof = stringToDelegation(
        /** @type {API.EncodedDelegation<[API.Top]>} */ (delegation)
      )

      const del = await Space.top.delegate({
        audience: invocation.issuer,
        issuer: ctx.signer,
        with: proof.capabilities[0].with,
        expiration: Infinity,
        proofs: [proof],
        // @ts-ignore
        facts: metadata ? [metadata] : undefined,
      })
      results.push(delegationToString(del))
    }
  }
  return {
    ok: results,
  }
}

/**
 * @param {API.Input<Space.recoverValidation>} input
 * @param {API.RouteContext} ctx
 * @returns {Promise<API.Result<string, API.Failure>>}
 */
export const recoverValidation = async ({ capability }, ctx) => {
  // check if we have delegations in the KV for the email
  // if yes send email with space/recover
  // if not error "no spaces for email X"

  const spaces = await ctx.models.spaces.getByEmail(capability.nb.identity)
  if (!spaces) {
    return fail(
      `No spaces found for email: ${capability.nb.identity.replace(
        'mailto:',
        ''
      )}.`
    )
  }

  const inv = await Space.recover
    .invoke({
      issuer: ctx.signer,
      audience: Provider.DID.parse(capability.with),
      with: ctx.signer.did(),
      lifetimeInSeconds: 60 * 10,
      nb: {
        identity: capability.nb.identity,
      },
      proofs: [
        await Space.recover.delegate({
          audience: ctx.signer,
          issuer: ctx.signer,
          expiration: Infinity,
          with: ctx.signer.did(),
          nb: {
            identity: 'mailto:*',
          },
        }),
      ],
    })
    .delegate()

  const encoded = delegationToString(inv)
  const url = `${ctx.url.protocol}//${ctx.url.host}/validate-email?ucan=${encoded}&mode=recover`

  // For testing
  if (ctx.config.ENV === 'test') {
    return { ok: url }
  }

  await ctx.email.sendValidation({
    to: capability.nb.identity.replace('mailto:', ''),
    url,
  })

  return { ok: '' }
}

/**
 * @param {API.RouteContext} ctx
 */
export const provide = (ctx) => ({
  info: Provider.provide(Space.info, (input) => info(input, ctx)),
  recover: Provider.provide(Space.recover, (input) => recover(input, ctx)),
  'recover-validation': Provider.provide(Space.recoverValidation, (input) =>
    recoverValidation(input, ctx)
  ),
})
