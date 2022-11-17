import * as Server from '@ucanto/server'
import { Failure } from '@ucanto/server'
import * as Space from '@web3-storage/access/capabilities/space'
import { voucherClaimProvider } from './voucher-claim.js'
import { voucherRedeemProvider } from './voucher-redeem.js'
import * as DID from '@ipld/dag-ucan/did'
import {
  delegationToString,
  stringToDelegation,
} from '@web3-storage/access/encoding'
import { any } from '@web3-storage/access/capabilities/wildcard'

/**
 * @param {import('../bindings').RouteContext} ctx
 * @returns {import('@web3-storage/access/types').Service}
 */
export function service(ctx) {
  return {
    voucher: {
      claim: voucherClaimProvider(ctx),
      redeem: voucherRedeemProvider(ctx),
    },

    space: {
      info: Server.provide(Space.info, async ({ capability, invocation }) => {
        const results = await ctx.kvs.spaces.get(capability.with)
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
              } does not service did ${ctx.signer.did()}`
            )
          }

          const encoded = await ctx.kvs.spaces.getDelegations(
            capability.nb.identity
          )
          if (!encoded) {
            return new Failure(
              `No delegations found for ${capability.nb.identity}`
            )
          }

          const results = []
          for (const e of encoded) {
            const proof = await stringToDelegation(e)
            const del = await any.delegate({
              audience: invocation.issuer,
              issuer: ctx.signer,
              with: proof.capabilities[0].with,
              expiration: Infinity,
              proofs: [proof],
            })

            results.push(await delegationToString(del))
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

          const email = capability.nb.identity
          if (!(await ctx.kvs.spaces.hasDelegations(email))) {
            return new Failure(
              `No spaces found for email: ${email.replace('mailto:', '')}.`
            )
          }

          const inv = await Space.recover
            .invoke({
              issuer: ctx.signer,
              audience: DID.parse(capability.with),
              with: ctx.signer.did(),
              lifetimeInSeconds: 60 * 10,
              nb: {
                identity: email,
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

          const encoded = await delegationToString(inv)
          const url = `${ctx.url.protocol}//${ctx.url.host}/validate-email?ucan=${encoded}&mode=recover`

          // For testing
          if (ctx.config.ENV === 'test') {
            return url
          }
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
