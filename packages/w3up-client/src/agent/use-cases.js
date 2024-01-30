import { addSpacesFromDelegations, Agent as AccessAgent } from '../agent.js'
import * as Access from '@web3-storage/capabilities/access'
import { bytesToDelegations } from './encoding.js'
import { Provider, Plan } from '@web3-storage/capabilities'
import * as w3caps from '@web3-storage/capabilities'
import { Schema, delegate } from '@ucanto/core'
import { AgentData, isAttestation } from './data.js'
import * as DidMailto from '@web3-storage/did-mailto'
import * as API from '../types.js'

const DIDWeb = Schema.DID.match({ method: 'web' })

/**
 * Request access by a session allowing this agent to issue UCANs
 * signed by the account.
 *
 * @param {AccessAgent} access
 * @param {API.Principal<API.AccountDID>} account
 * @param {Iterable<{ can: API.Ability }>} capabilities
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
 * @param {API.DID} [audienceOfClaimedDelegations] - audience of claimed delegations. defaults to access.connection.id.did()
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
 * @param {API.SpaceDID} opts.space
 * @param {API.Principal<API.AccountDID>} opts.account
 * @param {API.ProviderDID} opts.provider - e.g. 'did:web:staging.web3.storage'
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
 * @typedef {(delegations: API.Delegation[]) => boolean} DelegationsChecker
 */

/**
 * @type DelegationsChecker
 */
export function delegationsIncludeSessionProof(delegations) {
  return delegations.some((d) => isAttestation(d))
}

/**
 * @param {DelegationsChecker} delegationsMatch
 * @param {AccessAgent} access
 * @param {API.DID} delegee
 * @param {object} [opts]
 * @param {number} [opts.interval]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<Iterable<API.Delegation>>}
 */
export async function pollAccessClaimUntil(
  delegationsMatch,
  access,
  delegee,
  opts
) {
  const interval = opts?.interval || 250
  // eslint-disable-next-line no-constant-condition
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
 * @typedef {(accessAgent: AccessAgent, opts: AuthorizationWaiterOpts<U>) => Promise<Iterable<API.Delegation>>} AuthorizationWaiter
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
 * @param {Iterable<{ can: API.Ability }>} [opts.capabilities]
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
      { can: 'subscription/list' },
      { can: 'upload/*' },
      { can: 'ucan/*' },
      { can: 'plan/*' },
      { can: 'usage/*' },
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
 * @param {Iterable<{ can: API.Ability }>} [opts.capabilities]
 * @param {boolean} [opts.addProofs]
 * @param {AuthorizationWaiter} [opts.expectAuthorization] - function that will resolve once account has confirmed the authorization request
 */
export async function authorizeWaitAndClaim(accessAgent, email, opts) {
  await authorizeAndWait(accessAgent, email, opts)
  await claimAccess(accessAgent, accessAgent.issuer.did(), {
    addProofs: opts?.addProofs ?? true,
  })
}

/**
 * Provisions space with the specified account and sets up a recovery with the
 * same account.
 *
 * @param {AccessAgent} access
 * @param {AgentData} agentData
 * @param {string} email
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @param {API.DID<'key'>} [opts.space]
 * @param {API.ProviderDID} [opts.provider] - provider to register - defaults to this.connection.id
 */
export async function addProviderAndDelegateToAccount(
  access,
  agentData,
  email,
  opts
) {
  const space = opts?.space || access.currentSpace()
  const spaceMeta = space ? agentData.spaces.get(space) : undefined
  const provider =
    opts?.provider ||
    (() => {
      const service = access.connection.id.did()
      if (DIDWeb.is(service)) {
        // connection.id did is a valid provider value. Try using that.
        return service
      }
      throw new Error(
        `unable to determine provider to use to addProviderAndDelegateToAccount using access.connection.id did ${service}. expected a did:web:`
      )
    })()

  if (!space || !spaceMeta) {
    throw new Error('No space selected')
  }

  if (spaceMeta) {
    throw new Error('Space already registered with web3.storage.')
  }
  const account = { did: () => DidMailto.fromEmail(DidMailto.email(email)) }
  await addProvider({ access, space, account, provider })
  const delegateSpaceAccessResult = await delegateSpaceAccessToAccount(
    access,
    space,
    account
  )
  if (delegateSpaceAccessResult.out.error) {
    throw delegateSpaceAccessResult.out.error
  }

  await agentData.addSpace(space, spaceMeta)
}

/**
 * @param {AccessAgent} access
 * @param {API.SpaceDID} space
 * @param {API.Principal<API.AccountDID>} account
 */
async function delegateSpaceAccessToAccount(access, space, account) {
  const issuerSaysAccountCanAdminSpace =
    await createIssuerSaysAccountCanAdminSpace(
      access.issuer,
      space,
      account,
      undefined,
      access.proofs([{ with: space, can: '*' }]),
      // we want to sign over control of this space forever
      Infinity
    )
  return access.invokeAndExecute(Access.delegate, {
    audience: access.connection.id,
    with: space,
    expiration: Infinity,
    nb: {
      delegations: {
        [issuerSaysAccountCanAdminSpace.cid.toString()]:
          issuerSaysAccountCanAdminSpace.cid,
      },
    },
    proofs: [
      // must be embedded here because it's referenced by cid in .nb.delegations
      issuerSaysAccountCanAdminSpace,
    ],
  })
}

/**
 * @param {API.Signer<API.DIDKey>} issuer
 * @param {API.SpaceDID} space
 * @param {API.Principal<API.AccountDID>} account
 * @param {API.Capabilities} capabilities
 * @param {API.Delegation[]} proofs
 * @param {number} expiration
 * @returns
 */
async function createIssuerSaysAccountCanAdminSpace(
  issuer,
  space,
  account,
  capabilities = [
    {
      can: '*',
      with: space,
    },
  ],
  proofs = [],
  expiration
) {
  return delegate({
    issuer,
    audience: account,
    capabilities,
    proofs,
    expiration,
  })
}

/**
 *
 * @param {AccessAgent} agent
 * @param {API.AccountDID} account
 */
export async function getAccountPlan(agent, account) {
  const receipt = await agent.invokeAndExecute(Plan.get, {
    with: account,
  })
  return receipt.out
}
