import { addSpacesFromDelegations, Agent as AccessAgent } from './agent.js'
import * as Ucanto from '@ucanto/interface'
import * as Access from '@web3-storage/capabilities/access'
import { bytesToDelegations } from './encoding.js'
import { Provider } from '@web3-storage/capabilities'
import * as w3caps from '@web3-storage/capabilities'
import { isSessionProof } from './agent-data.js'
import * as DidMailto from '@web3-storage/did-mailto'

/**
 * Request access by a session allowing this agent to issue UCANs
 * signed by the account.
 *
 * @param {AccessAgent} access
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} account
 * @param {Iterable<{ can: Ucanto.Ability }>} capabilities
 */
export async function requestAccess(access, account, capabilities) {
  const res = await access.invokeAndExecute(Access.authorize, {
    audience: access.connection.id,
    with: access.issuer.did(),
    nb: {
      iss: account.did(),
      att: [...capabilities],
    },
  })
  if (res?.out.error) {
    throw res.out.error
  }
}

/**
 * claim delegations delegated to an audience
 *
 * @param {AccessAgent} access
 * @param {Ucanto.DID} [audienceOfClaimedDelegations] - audience of claimed delegations. defaults to access.connection.id.did()
 * @param {object} opts
 * @param {boolean} [opts.addProofs] - whether to addProof to access agent
 * @returns
 */
export async function claimAccess(
  access,
  audienceOfClaimedDelegations = access.connection.id.did(),
  { addProofs = false } = {}
) {
  const res = await access.invokeAndExecute(Access.claim, {
    audience: access.connection.id,
    with: audienceOfClaimedDelegations,
  })
  if (res.out.error) {
    throw res.out.error
  }
  const delegations = Object.values(res.out.ok.delegations).flatMap((bytes) =>
    bytesToDelegations(bytes)
  )
  if (addProofs) {
    for (const d of delegations) {
      await access.addProof(d)
    }

    await addSpacesFromDelegations(access, delegations)
  }

  return delegations
}

/**
 * @param {object} opts
 * @param {AccessAgent} opts.access
 * @param {Ucanto.DID<'key'>} opts.space
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} opts.account
 * @param {Ucanto.DID<'web'>} opts.provider - e.g. 'did:web:staging.web3.storage'
 */
export async function addProvider({ access, space, account, provider }) {
  const result = await access.invokeAndExecute(Provider.add, {
    audience: access.connection.id,
    with: account.did(),
    nb: {
      provider,
      consumer: space,
    },
  })
  if (result.out.error) {
    throw result.out.error
  }
}

/**
 * @typedef {(delegations: Ucanto.Delegation<Ucanto.Capabilities>[]) => boolean} DelegationsChecker
 */

/**
 * @type DelegationsChecker
 */
export function delegationsIncludeSessionProof(delegations) {
  return delegations.some((d) => isSessionProof(d))
}

/**
 * @param {DelegationsChecker} delegationsMatch
 * @param {AccessAgent} access
 * @param {Ucanto.DID} delegee
 * @param {object} [opts]
 * @param {number} [opts.interval]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<Iterable<Ucanto.Delegation>>}
 */
export async function pollAccessClaimUntil(
  delegationsMatch,
  access,
  delegee,
  opts
) {
  const interval = opts?.interval || 250
  while (true) {
    if (opts?.signal?.aborted)
      throw opts.signal.reason ?? new Error('operation aborted')
    const res = await access.invokeAndExecute(w3caps.Access.claim, {
      with: delegee,
    })
    if (res.out.error) throw res.out.error
    const claims = Object.values(res.out.ok.delegations).flatMap((d) =>
      bytesToDelegations(d)
    )
    if (delegationsMatch(claims)) return claims
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}

/**
 * @template [T={}]
 * @typedef {{ signal?: AbortSignal } & T} AuthorizationWaiterOpts
 */
/**
 * @template [U={}]
 * @typedef {(accessAgent: AccessAgent, opts: AuthorizationWaiterOpts<U>) => Promise<Iterable<Ucanto.Delegation>>} AuthorizationWaiter
 */

/**
 * Wait for authorization process to complete by polling executions of the
 * `access/claim` capability and waiting for the result to include
 * a session delegation.
 *
 * @type AuthorizationWaiter<{interval?: number}>
 */
export async function waitForAuthorizationByPolling(access, opts = {}) {
  const claimed = await pollAccessClaimUntil(
    delegationsIncludeSessionProof,
    access,
    access.issuer.did(),
    {
      signal: opts?.signal,
      interval: opts?.interval,
    }
  )
  return [...claimed]
}

/**
 * Request authorization of a session allowing this agent to issue UCANs
 * signed by the passed email address.
 *
 * @param {AccessAgent} access
 * @param {`${string}@${string}`} email
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @param {boolean} [opts.dontAddProofs] - whether to skip adding proofs to the agent
 * @param {Iterable<{ can: Ucanto.Ability }>} [opts.capabilities]
 * @param {AuthorizationWaiter} [opts.expectAuthorization] - function that will resolve once account has confirmed the authorization request
 */
export async function authorizeAndWait(access, email, opts = {}) {
  const expectAuthorization =
    opts.expectAuthorization || waitForAuthorizationByPolling
  const account = { did: () => DidMailto.fromEmail(email) }
  await requestAccess(
    access,
    account,
    opts?.capabilities || [
      { can: 'space/*' },
      { can: 'store/*' },
      { can: 'provider/add' },
      { can: 'upload/*' },
      { can: 'ucan/*' },
      { can: 'plan/*' },
      { can: 'w3up/*' },
    ]
  )
  const sessionDelegations = [...(await expectAuthorization(access, opts))]
  if (!opts?.dontAddProofs) {
    await Promise.all(sessionDelegations.map(async (d) => access.addProof(d)))
  }
}

/**
 * Request authorization of a session allowing this agent to issue UCANs
 * signed by the passed email address.
 *
 * @param {AccessAgent} accessAgent
 * @param {`${string}@${string}`} email
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @param {Iterable<{ can: Ucanto.Ability }>} [opts.capabilities]
 * @param {boolean} [opts.addProofs]
 * @param {AuthorizationWaiter} [opts.expectAuthorization] - function that will resolve once account has confirmed the authorization request
 */
export async function authorizeWaitAndClaim(accessAgent, email, opts) {
  await authorizeAndWait(accessAgent, email, opts)
  await claimAccess(accessAgent, accessAgent.issuer.did(), {
    addProofs: opts?.addProofs ?? true,
  })
}
