import * as Server from '@ucanto/server'
import * as Voucher from '@web3-storage/access/capabilities/voucher'
import { delegationToString } from '@web3-storage/access/encoding'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function voucherClaimProvider(ctx) {
  return Server.provide(Voucher.claim, async ({ capability, invocation }) => {
    const proof = await Voucher.redeem.delegate({
      audience: ctx.signer,
      issuer: ctx.signer,
      expiration: Infinity,
      with: ctx.signer.did(),
      nb: {
        product: 'product:*',
        identity: 'mailto:*',
        account: 'did:*',
      },
    })

    const inv = await Voucher.redeem
      .invoke({
        issuer: ctx.signer,
        audience: invocation.issuer,
        with: ctx.signer.did(),
        lifetimeInSeconds: 60 * 10, // 10 mins
        nb: {
          account: capability.with,
          identity: capability.nb.identity,
          product: capability.nb.product,
        },
        proofs: [proof],
      })
      .delegate()

    const encoded = await delegationToString(inv)
    // For testing
    if (ctx.config.ENV === 'test') {
      return encoded
    }

    const url = `${ctx.url.protocol}//${
      ctx.url.host
    }/validate-email?ucan=${encoded}&did=${invocation.issuer.did()}`

    await ctx.email.sendValidation({
      to: capability.nb.identity.replace('mailto:', ''),
      url,
    })
  })
}
