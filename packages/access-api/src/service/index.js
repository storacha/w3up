import * as Server from '@ucanto/server'
import * as Identity from '@web3-storage/access/capabilities/identity'
import * as Account from '@web3-storage/access/capabilities/account'
import { identityRegisterProvider } from './identity-register.js'
import { identityValidateProvider } from './identity-validate.js'
import { voucherClaimProvider } from './voucher-claim.js'
import { voucherRedeemProvider } from './voucher-redeem.js'
import { Failure } from '@ucanto/server'

/**
 * @param {import('../bindings').RouteContext} ctx
 * @returns {import('@web3-storage/access/types').Service}
 */
export function service(ctx) {
  return {
    identity: {
      validate: identityValidateProvider(ctx),
      register: identityRegisterProvider(ctx),
      identify: Server.provide(Identity.identify, async ({ capability }) => {
        const result = await ctx.kvs.accounts.get(capability.with)
        return result?.account
      }),
    },
    voucher: {
      claim: voucherClaimProvider(ctx),
      redeem: voucherRedeemProvider(ctx),
    },

    account: {
      // @ts-expect-error - types from query dont match handler output
      info: Server.provide(Account.info, async ({ capability }) => {
        const { results } = await ctx.db.fetchOne({
          tableName: 'accounts',
          fields: '*',
          where: {
            conditions: 'did =?1',
            params: [capability.with],
          },
        })

        if (!results) {
          throw new Failure('Account not found...')
        }
        return {
          did: results.did,
          agent: results.agent,
          email: results.email,
          product: results.product,
          updated_at: results.update_at,
          inserted_at: results.inserted_at,
        }
      }),
      // all: Server.provide(Account.all, async ({ capability }) => {
      //   return capability
      // }),
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
