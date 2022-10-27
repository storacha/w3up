import * as Server from '@ucanto/server'
import { Failure } from '@ucanto/server'
import * as Account from '@web3-storage/access/capabilities/account'
import { voucherClaimProvider } from './voucher-claim.js'
import { voucherRedeemProvider } from './voucher-redeem.js'
import * as DID from '@ipld/dag-ucan/did'
import { delegationToString } from '@web3-storage/access/encoding'

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
      info: Server.provide(Account.info, async ({ capability }) => {
        const results = await ctx.kvs.accounts.get(capability.with)
        if (!results) {
          throw new Failure('Account not found...')
        }
        return results
      }),

      'recover-validation': Server.provide(
        Account.recoverValidation,
        async ({ capability }) => {
          // check if we have delegations in the KV for the email
          // if yes send email with account/login
          // if not error "no accounts for email X"

          const email = capability.nb.email
          if (!(await ctx.kvs.accounts.hasAccounts(email))) {
            throw new Failure(
              `No accounts found for email: ${email.replace('mailto:', '')}.`
            )
          }

          const inv = await Account.recover
            .invoke({
              issuer: ctx.signer,
              audience: DID.parse(capability.with),
              with: ctx.signer.did(),
              lifetimeInSeconds: 60 * 10,
              proofs: [
                await Account.recover.delegate({
                  audience: ctx.signer,
                  issuer: ctx.signer,
                  lifetimeInSeconds: 60 * 1000,
                  with: ctx.signer.did(),
                }),
              ],
            })
            .delegate()

          const encoded = await delegationToString(inv)
          // For testing
          if (ctx.config.ENV === 'test') {
            return encoded
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
