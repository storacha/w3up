import * as ucanto from '@ucanto/core'
import * as API from '../api.js'
import * as Server from '@ucanto/server'
import * as validator from '@ucanto/validator'
import { Failure } from '@ucanto/server'
import * as Space from '@web3-storage/capabilities/space'
import { top } from '@web3-storage/capabilities/top'
import {
  delegationToString,
  stringToDelegation,
} from '@web3-storage/access/encoding'

import * as uploadApi from './upload-api-proxy.js'
import * as Access from './access.js'
import * as Consumer from './consumer.js'
import * as Customer from './customer.js'
import * as Provider from './provider.js'
import * as Voucher from './voucher.js'

/**
 * @param {API.RouteContext} ctx
 * @returns {API.Service}
 */
export function service(ctx) {
  /** @param {API.DID<'key'>} space */

  return {
    store: uploadApi.createStoreProxy(ctx),
    upload: uploadApi.createUploadProxy(ctx),
    access: Access.provide(ctx),
    provider: Provider.provide(ctx),
    voucher: Voucher.provide(ctx),
    space: {
      info: Server.provide(Space.info, async ({ capability, invocation }) => {
        const spaceDid = capability.with
        if (!validator.DID.match({ method: 'key' }).is(spaceDid)) {
          /** @type {import('@web3-storage/access/types').SpaceUnknown} */
          const unexpectedSpaceDidFailure = {
            name: 'SpaceUnknown',
            message: `can only get info for did:key spaces`,
          }
          return {
            error: unexpectedSpaceDidFailure,
          }
        }
        if (
          await spaceHasStorageProviderFromProviderAdd(
            spaceDid,
            ctx.models.provisions
          )
        ) {
          return {
            ok: { did: spaceDid },
          }
        }
        // this only exists if the space was registered via voucher/redeem
        const space = await ctx.models.spaces.get(capability.with)
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
      }),
      recover: Server.provide(
        Space.recover,
        async ({ capability, invocation }) => {
          if (capability.with !== ctx.signer.did()) {
            return {
              error: new Failure(
                `Resource ${
                  capability.with
                } does not match service did ${ctx.signer.did()}`
              ),
            }
          }

          const spaces = await ctx.models.spaces.getByEmail(
            capability.nb.identity
          )
          if (!spaces) {
            return {
              error: new Failure(
                `No delegations found for ${capability.nb.identity}`
              ),
            }
          }

          const results = []
          for (const { delegation, metadata } of spaces) {
            if (delegation) {
              const proof = stringToDelegation(
                /** @type {import('@web3-storage/access/types').EncodedDelegation<[import('@web3-storage/access/types').Top]>} */ (
                  delegation
                )
              )
              const del = await top.delegate({
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
      ),

      'recover-validation': Server.provide(
        Space.recoverValidation,
        async ({ capability }) => {
          // check if we have delegations in the KV for the email
          // if yes send email with space/recover
          // if not error "no spaces for email X"

          const spaces = await ctx.models.spaces.getByEmail(
            capability.nb.identity
          )
          if (!spaces) {
            return {
              error: new Failure(
                `No spaces found for email: ${capability.nb.identity.replace(
                  'mailto:',
                  ''
                )}.`
              ),
            }
          }

          const inv = await Space.recover
            .invoke({
              issuer: ctx.signer,
              audience: ucanto.DID.parse(capability.with),
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
            return { ok: { url } }
          }

          await ctx.email.sendValidation({
            to: capability.nb.identity.replace('mailto:', ''),
            url,
          })

          return { ok: {} }
        }
      ),
    },

    consumer: Consumer.provide(ctx),
    customer: Customer.provide(ctx),

    // @ts-ignore
    testing: {
      pass() {
        return 'test pass'
      },
      fail() {
        throw new Error('test fail')
      },
    },
  }
}

/**
 * @template {API.DID<'web'>} Service
 * @param {API.DID<'key'>} space
 * @param {API.ProvisionsStorage<Service>} provisions
 * @returns {Promise<boolean>}
 */
async function spaceHasStorageProviderFromProviderAdd(space, provisions) {
  const { ok } = await provisions.hasStorageProvider(space)
  return ok || false
}
