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
      const session = await Access.session
        .invoke({
          issuer: ctx.signer,
          audience: DID.parse(capability.nb.as),
          with: ctx.signer.did(),
          expiration: Infinity,
          nb: {
            key: capability.with,
          },
        })
        .delegate()

      const encoded = delegationToString(session)

      await ctx.models.accounts.create(capability.nb.as)

      const url = `${ctx.url.protocol}//${ctx.url.host}/validate-email?ucan=${encoded}&mode=session`
      // For testing
      if (ctx.config.ENV === 'test') {
        return url
      }

      await ctx.email.sendValidation({
        to: Mailto.toEmail(capability.nb.as),
        url,
      })
    }
  )
}
