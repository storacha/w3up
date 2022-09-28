import * as Server from '@ucanto/server'
import * as Identity from '@web3-storage/access/capabilities/identity'
import { identityRegisterProvider } from './identity-register.js'
import { identityValidateProvider } from './identity-validate.js'
import { voucherClaimProvider } from './voucher-claim.js'
import { voucherRedeemProvider } from './voucher-redeem.js'

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
