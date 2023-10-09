import * as Server from '@ucanto/server'
import { Revoked } from '@ucanto/validator'
import * as Client from '@ucanto/client'
import * as Types from './types.js'
import * as Legacy from '@ucanto/transport/legacy'
import * as CAR from '@ucanto/transport/car'
import { createService as createStoreService } from './store.js'
import { createService as createUploadService } from './upload.js'
import { createService as createConsoleService } from './console.js'
import { createService as createAccessService } from './access.js'
import { createService as createConsumerService } from './consumer.js'
import { createService as createCustomerService } from './customer.js'
import { createService as createSpaceService } from './space.js'
import { createService as createProviderService } from './provider.js'
import { createService as createSubscriptionService } from './subscription.js'
import { createService as createAdminService } from './admin.js'
import { createService as createRateLimitService } from './rate-limit.js'
import { createService as createUcanService } from './ucan.js'

export * from './types.js'

/**
 * @param {Omit<Types.UcantoServerContext, 'validateAuthorization'>} options
 */
export const createServer = ({ id, codec = Legacy.inbound, ...context }) =>
  Server.create({
    id,
    codec,
    service: createService(context),
    catch: (error) => context.errorReporter.catch(error),
    validateAuthorization: createRevocationChecker(context),
  })

/**
 *
 * @param {Types.RevocationServiceContext} context
 * @returns {Types.UcantoServerContext['validateAuthorization']}
 */
export const createRevocationChecker =
  ({ revocationsStorage }) =>
  async (auth) => {
    // Compute map of UCANs to principals with revocation authority.
    const authority = toRevocationAuthority(auth)
    // Fetch all the revocations for all the UCANs in the authorization chain.
    const result = await revocationsStorage.query(authority)

    // If query failed we also fail the verification. TODO: Define other error
    // types because here we do not know if ucan had been revoked or not.
    if (result.error) {
      return { error: new Revoked(auth.delegation) }
    }

    // Now we go through each revocation and check if revocation issuer has
    // an authority to revoke the UCAN. If so we fail, otherwise we continue.
    for (const [revoke, scope = {}] of Object.entries(result.ok)) {
      for (const principal of Object.keys(scope)) {
        const ucan = (authority[revoke] || {})[
          /** @type {Types.DID} */ (principal)
        ]
        if (ucan) {
          return { error: new Revoked(ucan) }
        }
      }
    }

    // If no relevant revocation had been found we succeed the verification.
    return { ok: {} }
  }

/**
 * Takes an authorization chain and computes mapping between delegation (CID)
 * and principals with revocation authority.
 *
 * @param {Types.Authorization} authorization
 * @param {Record<Types.DID, true>} [scope]
 * @param {Record<string, Record<Types.DID, Types.Delegation>>} [authority]
 * @returns {Record<string, Record<Types.DID, Types.Delegation>>}
 */

const toRevocationAuthority = (
  { delegation, proofs },
  // These arguments are used for recursion and are not meant to be provided
  // by the outside caller.
  scope = {},
  authority = {}
) => {
  // Add delegation issuer and audience as principals with revocation authority.
  const delegationScope = {
    ...scope,
    [delegation.issuer.did()]: delegation,
    [delegation.audience.did()]: delegation,
  }

  // Map delegation to corresponding revocations authorities. Given that we can
  // not see the same delegation twice in the same delegation chain we not need
  // to worry about overwriting same entry.
  authority[delegation.cid.toString()] = delegationScope

  // Recursively compute revocation authorities for each proof and incorporate
  // them into the final result.
  for (const proof of proofs) {
    Object.assign(authority, toRevocationAuthority(proof, delegationScope))
  }

  return authority
}

/**
 * @param {Types.ServiceContext} context
 * @returns {Types.Service}
 */
export const createService = (context) => ({
  access: createAccessService(context),
  console: createConsoleService(context),
  consumer: createConsumerService(context),
  customer: createCustomerService(context),
  provider: createProviderService(context),
  'rate-limit': createRateLimitService(context),
  admin: createAdminService(context),
  space: createSpaceService(context),
  store: createStoreService(context),
  subscription: createSubscriptionService(context),
  upload: createUploadService(context),
  ucan: createUcanService(context),
})

/**
 * @param {object} options
 * @param {Types.Principal} options.id
 * @param {Types.Transport.Channel<Types.Service>} options.channel
 * @param {Types.OutboundCodec} [options.codec]
 */
export const connect = ({ id, channel, codec = CAR.outbound }) =>
  Client.connect({
    id,
    channel,
    codec,
  })

export {
  createService as createUploadService,
  createServer as createUploadServer,
  connect as createUploadClient,
}
