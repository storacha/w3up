import * as Server from '@ucanto/server'
import { identityIdentify } from '@web3-storage/access/capabilities'
import { identityRegisterProvider } from './identity-register.js'
import { identityValidateProvider } from './identity-validate.js'

/**
 * @param {import('../bindings').RouteContext} ctx
 * @returns {import('@web3-storage/access/types').Service}
 */
export function service(ctx) {
  return {
    identity: {
      validate: identityValidateProvider(ctx),
      register: identityRegisterProvider(ctx),
      identify: Server.provide(identityIdentify, async ({ capability }) => {
        const result = await ctx.kvs.accounts.get(capability.with)
        return result?.account
      }),
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
