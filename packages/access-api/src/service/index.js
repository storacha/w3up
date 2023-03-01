import * as ucanto from '@ucanto/core'
import * as Server from '@ucanto/server'
import { Failure } from '@ucanto/server'
import * as Space from '@web3-storage/capabilities/space'
import { top } from '@web3-storage/capabilities/top'
import {
  delegationToString,
  stringToDelegation,
} from '@web3-storage/access/encoding'
import { voucherClaimProvider } from './voucher-claim.js'
import { voucherRedeemProvider } from './voucher-redeem.js'
import * as uploadApi from './upload-api-proxy.js'
import { accessAuthorizeProvider } from './access-authorize.js'
import { generateNoncePhrase } from '../utils/phrase.js'

/**
 * @param {import('../bindings').RouteContext} ctx
 * @returns { import('@web3-storage/access/types').Service
 * & { store: uploadApi.StoreServiceInferred }
 * & { upload: uploadApi.UploadServiceInferred }
 * }
 */
export function service(ctx) {
  return {
    store: uploadApi.createStoreProxy(ctx),
    upload: uploadApi.createUploadProxy(ctx),

    access: {
      authorize: accessAuthorizeProvider(ctx),
    },
    voucher: {
      claim: voucherClaimProvider(ctx),
      redeem: voucherRedeemProvider(ctx),
    },

    space: {
      info: Server.provide(Space.info, async ({ capability, invocation }) => {
        const results = await ctx.models.spaces.get(capability.with)
        if (!results) {
          /** @type {import('@web3-storage/access/types').SpaceUnknown} */
          const spaceUnknownFailure = {
            error: true,
            name: 'SpaceUnknown',
            message: `Space not found.`,
          }
          return spaceUnknownFailure
        }
        return results
      }),
      recover: Server.provide(
        Space.recover,
        async ({ capability, invocation }) => {
          if (capability.with !== ctx.signer.did()) {
            return new Failure(
              `Resource ${
                capability.with
              } does not match service did ${ctx.signer.did()}`
            )
          }

          const spaces = await ctx.models.spaces.getByEmail(
            capability.nb.identity
          )
          if (!spaces) {
            return new Failure(
              `No delegations found for ${capability.nb.identity}`
            )
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

          return results
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
            return new Failure(
              `No spaces found for email: ${capability.nb.identity.replace(
                'mailto:',
                ''
              )}.`
            )
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
          const nonce = generateNoncePhrase()

          // For testing
          if (ctx.config.ENV === 'test') {
            return url
          }

          await ctx.email.sendValidation({
            to: capability.nb.identity.replace('mailto:', ''),
            url,
            nonce,
          })
          return { matchPhrase: nonce }
        }
      ),
    },
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
