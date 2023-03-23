import * as ucanto from '@ucanto/core'
import * as Ucanto from '@ucanto/interface'
import * as Server from '@ucanto/server'
import * as validator from '@ucanto/validator'
import { Failure } from '@ucanto/server'
import * as Space from '@web3-storage/capabilities/space'
import * as Access from '@web3-storage/capabilities/access'
import { top } from '@web3-storage/capabilities/top'
import {
  delegationToString,
  stringToDelegation,
} from '@web3-storage/access/encoding'
import { voucherClaimProvider } from './voucher-claim.js'
import { voucherRedeemProvider } from './voucher-redeem.js'
import * as uploadApi from './upload-api-proxy.js'
import { accessAuthorizeProvider } from './access-authorize.js'
import { accessDelegateProvider } from './access-delegate.js'
import { accessClaimProvider } from './access-claim.js'
import { providerAddProvider } from './provider-add.js'
import { Spaces } from '../models/spaces.js'
import { handleAccessConfirm } from './access-confirm.js'

/**
 * @param {import('../bindings').RouteContext} ctx
 * @returns { import('@web3-storage/access/types').Service
 * & { store: uploadApi.StoreServiceInferred }
 * & { upload: uploadApi.UploadServiceInferred }
 * }
 */
export function service(ctx) {
  /** @param {Ucanto.DID<'key'>} space */
  const hasStorageProvider = async (space) =>
    spaceHasStorageProvider(space, ctx.models.spaces, ctx.models.provisions)
  return {
    store: uploadApi.createStoreProxy(ctx),
    upload: uploadApi.createUploadProxy(ctx),

    access: {
      authorize: accessAuthorizeProvider(ctx),
      claim: accessClaimProvider({
        delegations: ctx.models.delegations,
        config: ctx.config,
      }),
      confirm: Server.provide(
        Access.confirm,
        async ({ capability, invocation }) => {
          // only needed in tests
          if (ctx.config.ENV !== 'test') {
            throw new Error(`access/confirm is disabled`)
          }
          return handleAccessConfirm(
            /** @type {Ucanto.Invocation<import('@web3-storage/access/types').AccessConfirm>} */ (
              invocation
            ),
            ctx
          )
        }
      ),
      delegate: accessDelegateProvider({
        delegations: ctx.models.delegations,
        hasStorageProvider,
      }),
    },

    provider: {
      add: providerAddProvider(ctx),
    },

    voucher: {
      claim: voucherClaimProvider(ctx),
      redeem: voucherRedeemProvider(ctx),
    },

    space: {
      info: Server.provide(Space.info, async ({ capability, invocation }) => {
        const spaceDid = capability.with
        if (!validator.DID.match({ method: 'key' }).is(spaceDid)) {
          /** @type {import('@web3-storage/access/types').SpaceUnknown} */
          const unexpectedSpaceDidFailure = {
            error: true,
            name: 'SpaceUnknown',
            message: `can only get info for did:key spaces`,
          }
          return unexpectedSpaceDidFailure
        }
        if (
          await spaceHasStorageProviderFromProviderAdd(
            spaceDid,
            ctx.models.provisions
          )
        ) {
          return { did: spaceDid }
        }
        // this only exists if the space was registered via voucher/redeem
        const space = await ctx.models.spaces.get(capability.with)
        if (!space) {
          /** @type {import('@web3-storage/access/types').SpaceUnknown} */
          const spaceUnknownFailure = {
            error: true,
            name: 'SpaceUnknown',
            message: `Space not found.`,
          }
          return spaceUnknownFailure
        }
        /** @type {import('@web3-storage/access/types').SpaceRecord} */
        return space
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

          // For testing
          if (ctx.config.ENV === 'test') {
            return url
          }

          await ctx.email.sendValidation({
            to: capability.nb.identity.replace('mailto:', ''),
            url,
          })
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
      /**
       * @param {Ucanto.Invocation<Ucanto.Capability<'testing/space-storage', Ucanto.DID<'key'>, Ucanto.Failure>>} invocation
       */
      'space-storage': async (invocation) => {
        const spaceId = invocation.capabilities[0].with
        const hasStorageProvider =
          await ctx.models.provisions.hasStorageProvider(spaceId)
        return {
          hasStorageProvider,
          foo: 'ben',
        }
      },
    },
  }
}

/**
 * @template {Ucanto.DID} Service
 * @param {Ucanto.DID<'key'>} space
 * @param {Spaces} spaces
 * @param {import('../types/provisions.js').ProvisionsStorage<Service>} provisions
 * @returns {Promise<boolean>}
 */
async function spaceHasStorageProvider(space, spaces, provisions) {
  return (
    (await spaceHasStorageProviderFromProviderAdd(space, provisions)) ||
    (await spaceHasStorageProviderFromVoucherRedeem(space, spaces))
  )
}

/**
 * @param {Ucanto.DID<'key'>} space
 * @param {Spaces} spaces
 * @returns {Promise<boolean>}
 */
async function spaceHasStorageProviderFromVoucherRedeem(space, spaces) {
  const registered = Boolean(await spaces.get(space))
  return registered
}

/**
 * @template {Ucanto.DID} Service
 * @param {Ucanto.DID<'key'>} space
 * @param {import('../types/provisions.js').ProvisionsStorage<Service>} provisions
 * @returns {Promise<boolean>}
 */
async function spaceHasStorageProviderFromProviderAdd(space, provisions) {
  const registeredViaProviderAdd = await provisions.hasStorageProvider(space)
  return registeredViaProviderAdd
}
