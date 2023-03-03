// @ts-ignore
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'
import * as Server from '@ucanto/server'
import * as Access from '@web3-storage/capabilities/access'
import * as Mailto from '../utils/did-mailto.js'
import * as DID from '@ipld/dag-ucan/did'
import { delegationToString } from '@web3-storage/access/encoding'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function accessAuthorizeProvider(ctx) {
  return Server.provide(
    Access.authorize,
    async ({ capability, invocation }) => {
      /**
       * We re-delegate the capability to the account DID and limit it's
       * lifetime to 15 minutes which should be enough time for the user to
       * complete the authorization. We don't want to allow authorization for
       * long time because it could be used by an attacker to gain authorization
       * by sending second request misleading a user to click a wrong one.
       */
      const authorization = await Access.authorize
        .invoke({
          issuer: ctx.signer,
          audience: DID.parse(capability.nb.iss),
          with: capability.with,
          lifetimeInSeconds: 60 * 15, // 15 minutes
          nb: capability.nb,
          proofs: [invocation],
        })
        .delegate()

      const encoded = delegationToString(authorization)

      await ctx.models.accounts.create(capability.nb.iss)

      const url = `${ctx.url.protocol}//${ctx.url.host}/validate-email?ucan=${encoded}&mode=session`

      await ctx.email.sendValidation({
        to: Mailto.toEmail(capability.nb.iss),
        url,
      })

      return {}
    }
  )
}
