import * as Provider from '@ucanto/server'
import * as Voucher from '@web3-storage/capabilities/voucher'
import { delegationToString } from '@web3-storage/access/encoding'

/**
 * @param {import('../bindings').RouteContext} ctx
 */
export const provide = (ctx) =>
  Provider.provide(Voucher.claim, (input) => claim(input, ctx))

/**
 * @param {Provider.ProviderInput<Provider.InferInvokedCapability<typeof Voucher.claim>>} input
 * @param {import('../bindings').RouteContext} ctx
 */
export const claim = async ({ capability, invocation }, ctx) => {
  const proof = await Voucher.redeem.delegate({
    audience: ctx.signer,
    issuer: ctx.signer,
    expiration: Infinity,
    with: ctx.signer.did(),
    nb: {
      product: 'product:*',
      identity: 'mailto:*',
      space: 'did:*',
    },
  })

  const inv = await Voucher.redeem
    .invoke({
      issuer: ctx.signer,
      audience: invocation.issuer,
      with: ctx.signer.did(),
      lifetimeInSeconds: 60 * 10, // 10 mins
      nb: {
        space: capability.with,
        identity: capability.nb.identity,
        product: capability.nb.product,
      },
      proofs: [proof],
    })
    .delegate()

  const encoded = delegationToString(inv)
  // For testing
  if (ctx.config.ENV === 'test') {
    return { ok: encoded }
  }

  const url = `${ctx.url.protocol}//${ctx.url.host}/validate-email?ucan=${encoded}`

  await ctx.email.sendValidation({
    to: capability.nb.identity.replace('mailto:', ''),
    url,
  })

  return { ok: '' }
}
