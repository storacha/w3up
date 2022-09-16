import { provide, MalformedCapability, Failure } from '@ucanto/server'
import * as API from '../type.js'
import * as Identity from '../identity/capability.js'
import * as Capability from './capability.js'
import * as Signer from '../signer/lib.js'

/**
 * @param {API.Store.ServiceOptions} options
 * @returns {{store: API.Store.Store, identity:API.Identity.Identity}}
 */
export const create = ({ id, identity, accounting, signingOptions }) => ({
  store: {
    add: provide(Capability.Add, async ({ capability, invocation }) => {
      const link = /** @type {API.Store.CARLink|undefined} */ (
        capability.caveats.link
      )
      if (!link) {
        return new MalformedCapability(
          invocation.capabilities[0],
          new Failure(`No link was provided in the capability`)
        )
      }

      const group = /** @type {API.DID} */ (capability.with)
      // First we need to check if we have an account associted with a DID
      // car is been added to.
      const account = await Identity.Identify.invoke({
        issuer: id,
        audience: identity.id,
        with: group,
        proofs: [invocation],
      }).execute(identity)

      // If we failed to resolve an account we deny access by returning n error.
      if (account.error) {
        return account
      }

      const result = await accounting.add(group, link, invocation.cid)
      if (result.error) {
        return result
      }

      if (result.status === 'not-in-s3') {
        const { url, headers } = await Signer.sign(link, signingOptions)
        return {
          status: 'upload',
          with: group,
          link,
          url: url.href,
          headers,
        }
      } else {
        return {
          status: 'done',
          with: group,
          link,
        }
      }
    }),
    remove: provide(Capability.Remove, async ({ capability, invocation }) => {
      const { link } = capability.caveats
      if (!link) {
        return new MalformedCapability(
          invocation.capabilities[0],
          new Failure(`No link was provided in the capability`)
        )
      }

      const group = /** @type {API.DID} */ (capability.with)
      await accounting.remove(group, link, invocation.cid)
      return link
    }),
    list: provide(Capability.List, async ({ capability, invocation }) => {
      const group = /** @type {API.DID} */ (capability.with)
      return await accounting.list(group, invocation.cid)
    }),
  },
  // this is a boilerplate that redelegates all the `identity/*` capabilities
  // to the `identity` service.
  identity: {
    validate: (invocation) =>
      Identity.Validate.invoke({
        issuer: id,
        audience: identity.id,
        with: invocation.capabilities[0].with,
        caveats: { as: invocation.capabilities[0].as },
        proofs: [invocation],
      }).execute(identity),
    register: (invocation) =>
      Identity.Register.invoke({
        issuer: id,
        audience: identity.id,
        with: invocation.capabilities[0].with,
        caveats: { as: invocation.capabilities[0].as },
        proofs: [invocation],
      }).execute(identity),
    link: (invocation) =>
      Identity.Link.invoke({
        issuer: id,
        audience: identity.id,
        with: invocation.capabilities[0].with,
        caveats: { as: invocation.capabilities[0].as },
        proofs: [invocation],
      }).execute(identity),
    identify: (invocation) =>
      Identity.Identify.invoke({
        issuer: id,
        audience: identity.id,
        with: invocation.capabilities[0].with,
        proofs: [invocation],
      }).execute(identity),
  },
})
