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

/**
 * @param {import('../bindings').RouteContext} ctx
 * @returns {
 * & import('@web3-storage/access/types').Service
 * & { store: uploadApi.StoreServiceInferred }
 * & { upload: uploadApi.UploadServiceInferred }
 * }
 */
export function service(ctx) {
  return {
    store: uploadApi.createStoreProxy({
      ...ctx,
      fetch: patchedFetch(
        globalThis.fetch.bind(globalThis),
        async (response, fetchArgs) => {
          if (!response.ok) {
            try {
              ctx.log.warn(
                `unexpected non-ok response from fetch in createStoreProxy`,
                await describeFetch(response, fetchArgs)
              )
            } catch (error) {
              ctx.log.error(
                new Error(`error describing/logging fetch response`, {
                  cause: error,
                })
              )
            }
          }
        }
      ),
    }),
    upload: uploadApi.createUploadProxy(ctx),

    voucher: {
      claim: voucherClaimProvider(ctx),
      redeem: voucherRedeemProvider(ctx),
    },

    space: {
      info: Server.provide(Space.info, async ({ capability, invocation }) => {
        const results = await ctx.models.spaces.get(capability.with)
        if (!results) {
          return new Failure('Space not found.')
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
              const proof = await stringToDelegation(
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
    },
  }
}

/**
 * Wrap `fetch` producing a new fetch that will pass any responses it fetches to a cb.
 *
 * @param {typeof globalThis.fetch} fetch
 * @param {(response: Response, fetchArgs: Parameters<typeof globalThis.fetch>) => Promise<void>} onResponse - handles each response
 * @returns {typeof globalThis.fetch}
 */
function patchedFetch(fetch, onResponse) {
  /** @type {typeof globalThis.fetch} */
  const fetchWithLog = async (input, init) => {
    const response = await fetch(input, init)
    await onResponse(response, [
      input instanceof URL ? input.toString() : input,
      init,
    ])
    return response
  }
  return fetchWithLog
}

/**
 * Given a fetch invocation and the response it produced,
 * return an object that can be logged to describe the request/response fully.
 *
 * @param {Response} response
 * @param {Parameters<typeof globalThis.fetch>} fetchArgs
 */
async function describeFetch(response, fetchArgs) {
  return {
    request: fetchArgs,
    response: {
      type: response.type,
      ok: response.ok,
      redirected: response.redirected,
      headers: [...response.headers],
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      text: await response.clone().text(),
    },
  }
}
