import * as Server from '@ucanto/server'
import * as Voucher from '@web3-storage/access/capabilities/voucher'
import { delegationToString } from '@web3-storage/access/encoding'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export function voucherClaimProvider(ctx) {
  // Provider should have access to delegated vouchers which it can
  // redelegate. Currently however we just identify "free-tier" with a
  // provider DID.
  const products = new Map([
    [
      ctx.signer.did(),
      Voucher.redeem.delegate({
        audience: ctx.signer,
        issuer: ctx.signer,
        expiration: Infinity,
        with: ctx.signer.did(),
        nb: {
          identity: 'mailto:*',
        },
      }),
    ],
  ])

  return Server.provide(Voucher.claim, async ({ capability, invocation }) => {
    const productID = capability.nb.product
    const proof = await products.get(productID)
    if (!proof) {
      return new Server.Failure(`Product ${capability.nb.product} is not known`)
    }

    const inv = await Voucher.redeem
      .invoke({
        issuer: ctx.signer,
        audience: invocation.issuer,
        with: productID,
        lifetimeInSeconds: 60 * 10, // 10 mins
        nb: {
          // currently we delegate back to the DID on whos behalf claim was
          // issued. In the future will allow omitting this that voucher could
          // be requested without specifying account it will be used on.
          account: capability.with,
          identity: capability.nb.identity,
        },
        proofs: [proof],
      })
      .delegate()

    const encoded = await delegationToString(inv)
    // For testing
    if (ctx.config.ENV === 'test') {
      return encoded
    }

    const url = `${ctx.url.protocol}//${ctx.url.host}/validate-email?ucan=${encoded}`

    await ctx.email.sendValidation({
      to: capability.nb.identity.replace('mailto:', ''),
      url,
    })
  })
}
