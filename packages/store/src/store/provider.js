import { Failure, MalformedCapability, provide } from '@ucanto/server'

// import * as Access from '../access/capability.js'
import * as Capability from '@web3-storage/access/capabilities'
import * as Signer from '../signer/lib.js'
import * as API from '../type.js'

/**
 * @param {API.Store.ServiceOptions} options
 * @returns {{store: API.Store.Store, identity:API.Identity.Identity}}
 */
export const create = ({ id, identity, accounting, signingOptions }) => {
  // this is a boilerplate that redelegates all the `access/*` capabilities
  // to the `access` service.
  const identityProvider = {
    validate: (invocation) =>
      Capability.identityValidate
        .invoke({
          issuer: id,
          audience: identity.id,
          with: invocation.capabilities[0].with,
          caveats: { as: invocation.capabilities[0].as },
          proofs: [invocation],
        })
        .execute(identity),
    register: (invocation) =>
      Capability.identityRegister
        .invoke({
          issuer: id,
          audience: identity.id,
          with: invocation.capabilities[0].with,
          caveats: { as: invocation.capabilities[0].as },
          proofs: [invocation],
        })
        .execute(identity),
    identify: (invocation) =>
      Capability.identityIdentify
        .invoke({
          issuer: id,
          audience: identity.id,
          with: invocation.capabilities[0].with,
          proofs: [invocation],
        })
        .execute(identity),
  }

  return {
    identity: identityProvider,
    store: {
      add: provide(Capability.storeAdd, async ({ capability, invocation }) => {
        const link = /** @type {API.Store.CARLink|undefined} */ (
          capability.caveats.link
        )

        if (!link) {
          return new MalformedCapability(
            invocation.capabilities[0],
            new Failure(`No link was provided in the capability`)
          )
        }

        const account = await identityProvider.identify(invocation)
        if (account.error) {
          return account
        }

        const result = await accounting.add(account, link, invocation.cid)
        if (result.error) {
          return result
        }

        if (result.status === 'not-in-s3') {
          const { url, headers } = Signer.sign(link, signingOptions)
          return {
            status: 'upload',
            with: account,
            link,
            url: url.href,
            headers,
          }
        } else {
          return {
            status: 'done',
            with: account,
            link,
          }
        }
      }),
      remove: provide(
        Capability.storeRemove,
        async ({ capability, invocation }) => {
          const { link } = capability.caveats
          if (!link) {
            return new MalformedCapability(
              invocation.capabilities[0],
              new Failure(`No link was provided in the capability`)
            )
          }

          const account = await identityProvider.identify(invocation)
          if (account.error) {
            return account
          }

          await accounting.remove(account, link, invocation.cid)
          return link
        }
      ),
      list: provide(
        Capability.storeList,
        async ({ capability, invocation }) => {
          // First we need to check if we have an account associted with a DID car is been added to.
          const account = await identityProvider.identify(invocation)
          // If we failed to resolve an account we deny access by returning n error.
          if (account.error) {
            return account
          }

          return await accounting.list(account, invocation.cid)
        }
      ),
    },
  }
}
