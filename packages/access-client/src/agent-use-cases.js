import { addSpacesFromDelegations, Agent as AccessAgent } from './agent.js'
import * as Ucanto from '@ucanto/interface'
import * as Access from '@web3-storage/capabilities/access'
import { bytesToDelegations, stringToDelegation } from './encoding.js'
import { Provider } from '@web3-storage/capabilities'
import * as w3caps from '@web3-storage/capabilities'
import { Websocket, AbortError } from './utils/ws.js'
import { AgentData, isSessionProof } from './agent-data.js'
import * as ucanto from '@ucanto/core'
import { DID as DIDValidator } from '@ucanto/validator'
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
  if (res?.error) {
    throw res
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
  if (res.error) {
    throw res
  }
  const delegations = Object.values(res.delegations).flatMap((bytes) =>
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
  if (result.error) {
    throw result
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
  const claimed = await new Promise((resolve, reject) => {
    opts?.signal?.addEventListener('abort', (e) => {
      reject(
        new Error('pollAccessClaimUntilSessionProof aborted', { cause: e })
      )
    })
    poll(interval)
    /**
     * @param {number} retryAfter
     */
    async function poll(retryAfter) {
      const pollClaimResult = await access.invokeAndExecute(
        w3caps.Access.claim,
        { with: delegee }
      )
      if (pollClaimResult.error) {
        return reject(pollClaimResult)
      }
      try {
        const claimedDelegations = Object.values(
          pollClaimResult.delegations
        ).flatMap((d) => bytesToDelegations(d))
        if (delegationsMatch(claimedDelegations)) {
          resolve(claimedDelegations)
        } else {
          setTimeout(() => poll(retryAfter), retryAfter)
        }
      } catch (error) {
        reject(error)
      }
    }
  })
  return claimed
}

/**
 * @param {AccessAgent} access
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @deprecated - use waitForAuthorizationOnSocket
 */
export async function waitForDelegationOnSocket(access, opts) {
  const ws = new Websocket(access.url, 'validate-ws')
  await ws.open(opts)

  ws.send({
    did: access.did(),
  })

  try {
    const msg = await ws.awaitMsg(opts)

    if (msg.type === 'timeout') {
      await ws.close(1000, 'agent got timeout waiting for validation')
      throw new Error('Email validation timed out.')
    }

    if (msg.type === 'delegation') {
      const delegation = stringToDelegation(msg.delegation)
      await ws.close(1000, 'received delegation, agent is done with ws')
      return delegation
    }
  } catch (error) {
    if (error instanceof AbortError) {
      await ws.close(1000, 'AbortError: agent failed to get delegation')
      throw new TypeError('Failed to get delegation', { cause: error })
    }
    throw error
  }
  throw new TypeError('Failed to get delegation')
}

/**
 * @typedef {{signal?: AbortSignal }} AuthorizationWaiterOpts
 * @typedef {(accessAgent: AccessAgent, opts: AuthorizationWaiterOpts) => Promise<Iterable<Ucanto.Delegation>> } AuthorizationWaiter
 */

/**
 * Wait for the authorization process to complete by waiting on a
 * well-known websocket endpoint for the access-api server to
 * receive and forward a session delegation from the authorization
 * email flow.
 *
 * @type AuthorizationWaiter
 */
export async function waitForAuthorizationOnSocket(access, opts = {}) {
  const delegation = await waitForDelegationOnSocket(access, opts)
  return [delegation]
}

/**
 * Wait for authorization process to complete by polling executions of the
 * `access/claim` capability and waiting for the result to include
 * a session delegation.
 *
 * @type AuthorizationWaiter
 */
export async function waitForAuthorizationByPolling(access, opts = {}) {
  const claimed = await pollAccessClaimUntil(
    delegationsIncludeSessionProof,
    access,
    access.issuer.did(),
    {
      signal: opts?.signal,
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

/**
 * Request authorization of a session allowing this agent to issue UCANs
 * signed by the passed email address.
 *
 * @param {AccessAgent} access
 * @param {`${string}@${string}`} email
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @param {Iterable<{ can: Ucanto.Ability }>} [opts.capabilities]
 * @deprecated use authorizeWaitAndClaim directly going forward, passing it the expectAuthorization: waitForAuthorizationOnSocket to replicate this function's behavior
 */
export async function authorizeWithSocket(access, email, opts) {
  return authorizeWaitAndClaim(access, email, {
    ...opts,
    expectAuthorization: waitForAuthorizationOnSocket,
  })
}

/**
 * Invokes voucher/redeem for the free tier, wait on the websocket for the voucher/claim and invokes it
 *
 * It also adds a full space delegation to the service in the voucher/claim invocation to allow for recovery
 *
 * @param {AccessAgent} access
 * @param {AgentData} agentData
 * @param {string} email
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @param {Ucanto.DID<'key'>} [opts.space]
 * @param {Ucanto.DID<'web'>} [opts.provider] - provider to register - defaults to this.connection.id
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
      if (DIDValidator.match({ method: 'web' }).is(service)) {
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

  if (spaceMeta && spaceMeta.isRegistered) {
    throw new Error('Space already registered with web3.storage.')
  }
  const account = { did: () => DidMailto.fromEmail(DidMailto.email(email)) }
  await addProvider({ access, space, account, provider })
  const delegateSpaceAccessResult = await delegateSpaceAccessToAccount(
    access,
    space,
    account
  )
  if (delegateSpaceAccessResult.error) {
    throw delegateSpaceAccessResult
  }
  spaceMeta.isRegistered = true
  await agentData.addSpace(space, spaceMeta)
}

/**
 * @param {AccessAgent} access
 * @param {Ucanto.DID<'key'>} space
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} account
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
 * @param {Ucanto.Signer<Ucanto.DID<'key'>>} issuer
 * @param {Ucanto.DID} space
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} account
 * @param {Ucanto.Capabilities} capabilities
 * @param {Ucanto.Delegation[]} proofs
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
  return ucanto.delegate({
    issuer,
    audience: account,
    capabilities,
    proofs,
    expiration,
  })
}
