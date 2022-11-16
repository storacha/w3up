import * as Server from '@ucanto/server'
import { Failure } from '@ucanto/server'
import * as Account from '@web3-storage/access/capabilities/account'
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

    account: {
      info: Server.provide(Account.info, async ({ capability, invocation }) => {
        const results = await ctx.kvs.accounts.get(capability.with)
        if (!results) {
          return new Failure('Account not found.')
        }
        return results
      }),
      recover: Server.provide(
        Account.recover,
        async ({ capability, invocation }) => {
          if (capability.with !== ctx.signer.did()) {
            return new Failure(
              `Resource ${
                capability.with
              } does not service did ${ctx.signer.did()}`
            )
          }

          const encoded = await ctx.kvs.accounts.getDelegations(
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
        Account.recoverValidation,
        async ({ capability }) => {
          // check if we have delegations in the KV for the email
          // if yes send email with account/login
          // if not error "no accounts for email X"

          const email = capability.nb.identity
          if (!(await ctx.kvs.accounts.hasDelegations(email))) {
            return new Failure(
              `No accounts found for email: ${email.replace('mailto:', '')}.`
            )
          }

          const inv = await Account.recover
            .invoke({
              issuer: ctx.signer,
              audience: DID.parse(capability.with),
              with: ctx.signer.did(),
              lifetimeInSeconds: 60 * 10,
              nb: {
                identity: email,
              },
              proofs: [
                await Account.recover.delegate({
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
