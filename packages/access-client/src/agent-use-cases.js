import {
  addSpacesFromDelegations,
  Agent as AccessAgent,
  createDidMailtoFromEmail,
} from './agent.js'
import * as Ucanto from '@ucanto/interface'
import * as Access from '@web3-storage/capabilities/access'
import { bytesToDelegations, stringToDelegation } from './encoding.js'
import { Provider } from '@web3-storage/capabilities'
import * as w3caps from '@web3-storage/capabilities'
import { Websocket, AbortError } from './utils/ws.js'
import { isSessionProof } from './agent-data.js'

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
    throw new Error('failed to authorize session', { cause: res })
  }
}

/**
 * claim delegations delegated to an audience
 *
 * @param {AccessAgent} access
 * @param {Ucanto.DID} [delegee] - audience of claimed delegations. defaults to access.connection.id.did()
 * @param {object} options
 * @param {boolean} [options.addProofs] - whether to addProof to access agent
 * @returns
 */
export async function claimDelegations(
  access,
  delegee = access.connection.id.did(),
  { addProofs = false } = {}
) {
  const res = await access.invokeAndExecute(Access.claim, {
    audience: access.connection.id,
    with: delegee,
  })
  if (res.error) {
    throw new Error('error claiming delegations')
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
 * @param {AccessAgent} access
 * @param {Ucanto.DID<'key'>} space
 * @param {Ucanto.Principal<Ucanto.DID<'mailto'>>} account
 * @param {Ucanto.DID<'web'>} provider - e.g. 'did:web:staging.web3.storage'
 */
export async function addProvider(access, space, account, provider) {
  const result = await access.invokeAndExecute(Provider.add, {
    audience: access.connection.id,
    with: account.did(),
    nb: {
      provider,
      consumer: space,
    },
  })
  if (result.error) {
    throw new Error(`error adding provider`, { cause: result })
  }
}

/**
 * @param {AccessAgent} access
 * @param {Ucanto.DID} delegee
 * @param {object} [options]
 * @param {number} [options.interval]
 * @param {AbortSignal} [options.abort]
 * @returns {Promise<Iterable<Ucanto.Delegation>>}
 */
export async function expectNewClaimableDelegations(access, delegee, options) {
  const interval = options?.interval || 250
  const claim = () => claimDelegations(access, delegee)
  const initialClaimResult = await claim()
  const claimed = await new Promise((resolve, reject) => {
    options?.abort?.addEventListener('abort', (e) => {
      reject(new Error('expectNewClaimableDelegations aborted', { cause: e }))
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
      // got a response. If it contains same amount of delegations as initialClaimResult,
      // user has not clicked confirm
      const claimedDelegations = Object.values(
        pollClaimResult.delegations
      ).flatMap((d) => bytesToDelegations(d))
      if (claimedDelegations.length > initialClaimResult.length) {
        resolve(claimedDelegations)
      } else {
        setTimeout(() => poll(retryAfter), retryAfter)
      }
    }
  })
  return claimed
}

/**
 * @param {AccessAgent} access
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
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
 * Request authorization of a session allowing this agent to issue UCANs
 * signed by the passed email address.
 *
 * @param {AccessAgent} access
 * @param {`${string}@${string}`} email
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @param {boolean} [opts.dontAddProofs] - whether to skip adding proofs to the agent
 * @param {Iterable<{ can: Ucanto.Ability }>} [opts.capabilities]
 * @param {() => Promise<Iterable<Ucanto.Delegation>>} [opts.expectAuthorization] - function that will resolve once account has confirmed the authorization request
 */
export async function authorizeAndWait(access, email, opts) {
  const expectAuthorization =
    opts?.expectAuthorization ||
    function () {
      return expectNewClaimableDelegations(access, access.issuer.did(), {
        abort: opts?.signal,
      })
    }
  const account = { did: () => createDidMailtoFromEmail(email) }
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
  const sessionDelegations = [...(await expectAuthorization())]
  if (!opts?.dontAddProofs) {
    await Promise.all(sessionDelegations.map(async (d) => access.addProof(d)))
  }
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
 */
export async function authorizeWithSocket(access, email, opts) {
  const expectAuthorization = () =>
    /** @type {Promise<[Ucanto.Delegation<[import('./types').AccessSession]>]>} */
    (
      waitForDelegationOnSocket(access, {
        ...opts,
        signal: opts?.signal,
      }).then((d) => {
        return [d]
      })
    )
  await authorizeAndWait(access, email, {
    ...opts,
    expectAuthorization,
  })
  // claim delegations here because we will need an ucan/attest from the service to
  // pair with the session delegation we just claimed to make it work
  await claimDelegations(access, access.issuer.did(), { addProofs: true })
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
 */
export async function authorizeWithPollClaim(access, email, opts) {
  const expectAuthorization = () =>
    expectNewClaimableDelegations(access, access.issuer.did(), {
      abort: opts?.signal,
    }).then((claimed) => {
      if (![...claimed].some((d) => isSessionProof(d))) {
        throw new Error(
          `claimed new delegations, but none were a session proof`
        )
      }
      return [...claimed]
    })
  await authorizeAndWait(access, email, {
    ...opts,
    expectAuthorization,
  })
}
