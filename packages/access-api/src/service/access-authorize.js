import * as Server from '@ucanto/server'
import * as Access from '@web3-storage/capabilities/access'
import * as DidMailto from '@web3-storage/did-mailto'
import { delegationToString } from '@web3-storage/access/encoding'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function accessAuthorizeProvider(ctx) {
  return Server.provide(Access.authorize, async ({ capability }) => {
    /**
     * We issue `access/confirm` invocation which will
     * get embedded in the URL that we send to the user. When user clicks the
     * link we'll get this delegation back in the `/validate-email` endpoint
     * which will allow us to verify that it was the user who clicked the link
     * and not some attacker impersonating the user. We will know that because
     * the `with` field is our service DID and only private key holder is able
     * to issue such delegation.
     *
     * We limit lifetime of this UCAN to 15 minutes to reduce the attack
     * surface where an attacker could attempt concurrent authorization
     * request in attempt confuse a user into clicking the wrong link.
     */
    const confirmation = await Access.confirm
      .invoke({
        issuer: ctx.signer,
        // audience same as issuer because this is a service invocation
        // that will get handled by access/confirm handler
        // but only if the receiver of this email wants it to be
        audience: ctx.signer,
        // Because with is set to our DID no other actor will be able to issue
        // this delegation without our private key.
        with: ctx.signer.did(),
        lifetimeInSeconds: 60 * 15, // 15 minutes
        // We link to the authorization request so that this attestation can
        // not be used to authorize a different request.
        nb: {
          // we copy request details and set the `aud` field to the agent DID
          // that requested the authorization.
          ...capability.nb,
          aud: capability.with,
        },
      })
      .delegate()

    await ctx.models.accounts.create(capability.nb.iss)

    // Encode authorization request and our attestation as string so that it
    // can be passed as a query parameter in the URL.
    const encoded = delegationToString(confirmation)

    const url = `${ctx.url.protocol}//${ctx.url.host}/validate-email?ucan=${encoded}&mode=authorize`

    await ctx.email.sendValidation({
      to: DidMailto.toEmail(DidMailto.fromString(capability.nb.iss)),
      url,
    })

    return {}
  })
}
