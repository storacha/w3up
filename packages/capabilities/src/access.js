/**
 * Access Capabilities
 *
 * These can be imported directly with:
 * ```js
 * import * as Access from '@web3-storage/capabilities/access'
 * ```
 *
 * @module
 */
import {
  Ability,
  Provider,
  Account,
  Agent,
  capability,
  DID,
  Schema,
  Failure,
} from './schema.js'
import * as Types from '@ucanto/interface'
import { equalWith, fail, equal } from './utils.js'
export { top } from './top.js'

/**
 * Describes the capability requested.
 */
export const CapabilityRequest = Schema.struct({
  /**
   * If set to `"*"` it corresponds to "sudo" access.
   */
  can: Schema.string(),
})

export const Capability = Schema.struct({
  can: Schema.string(),
  with: Schema.URI,
  nb: Schema.unknown(),
})

/**
 * Authorization request describing set of desired capabilities.
 */
export const AuthorizationRequest = Schema.struct({
  /**
   * DID of the Account authorization is requested from.
   */
  iss: Account,
  /**
   * Capabilities agent wishes to be granted.
   */
  att: CapabilityRequest.array(),
})

/**
 * Capability can only be delegated (but not invoked) allowing audience to
 * derived any `access/` prefixed capability for the agent identified
 * by did:key in the `with` field.
 */
export const access = capability({
  can: 'access/*',
  with: Schema.URI.match({ protocol: 'did:' }),
})

/**
 * Describes set of abilities granted or requested.
 */
export const Allow = Schema.dictionary({
  key: Ability,
  // we may allow additional details in the future but for now we only allow
  // empty array.
  value: Schema.never().array(),
})

/**
 * Describes set of permissions granted or requested. It uses layout from
 * [UCAN 0.10](https://github.com/ucan-wg/spec/pull/132) as opposed to 0.9
 * used currently to avoid breaking changes in the future.
 */
const Access = Schema.dictionary({
  key: Schema.URI,
  value: Allow,
})

/**
 * Capability can be invoked by an agent to request set of capabilities from
 * the account.
 */
export const request = capability({
  can: 'access/request',
  with: DID.match({ method: 'key' }),
  /**
   * Authorization request describing set of desired capabilities
   */
  nb: Schema.struct({
    from: Account,
    access: Access,
  }),
  derives: (child, parent) => {
    return (
      fail(equalWith(child, parent)) ||
      fail(equal(child.nb.from, parent.nb.from, 'from')) ||
      fail(restrictAccess(child.nb.access, parent.nb.access)) ||
      true
    )
  },
})

/**
 * Capability is delegated by us to the user allowing them to complete the
 * authorization flow. It allows us to ensure that user clicks the link and
 * we don't have some rogue agent trying to impersonate user clicking the link
 * in order to get access to their account.
 */
export const authorize = capability({
  can: 'access/authorize',
  with: Account,
  nb: Schema.struct({
    agent: Agent,
    access: Access,
  }),
  derives: (claim, proof) => {
    return (
      fail(equalWith(claim, proof)) ||
      fail(equal(claim.nb.agent, claim.nb.agent, 'delegate')) ||
      fail(restrictAccess(claim.nb.access, proof.nb.access)) ||
      true
    )
  },
})

/**
 *
 * @param {Record<string, Record<string, Record<string, unknown>[]>>} granted
 * @param {Record<string, Record<string, Record<string, unknown>[]>>} approved
 */
const restrictAccess = (granted, approved) => {
  const anyResource = approved['ucan:*']
  for (const [uri, value] of Object.entries(granted)) {
    const resource = approved[uri] || anyResource
    if (!resource) {
      return new Failure(`Escalation resource '${uri}' has not been delegated`)
    }

    for (const [can, caveats] of Object.entries(value)) {
      const ability = resource[can] || resource['*']
      if (!ability) {
        return new Failure(
          `ability "${can}" has not been delegated for '${uri}'`
        )
      }

      // if caveats are not specified then it means no caveats are imposed
      // which is equivalent of `{}`.
      const approved = ability.length > 0 ? ability : [{}]
      const granted = caveats.length > 0 ? caveats : [{}]

      for (const need of granted) {
        const satisfied = approved.some((allow) => isSubStruct(need, allow))
        if (!satisfied) {
          return new Failure(
            `Escalation ability ${can} on resource '${uri}' with caveats ${JSON.stringify(
              need
            )} violates imposed caveats ${JSON.stringify(ability)}`
          )
        }
      }
    }
  }

  return true
}

/**
 * @template {Record<string, unknown>} T
 * @template {Record<string, unknown>} U
 * @param {T} a
 * @param {U} b
 */
const isSubStruct = (a, b) => {
  for (const [key, value] of Object.entries(a)) {
    if (key in b && JSON.stringify(b[key]) !== JSON.stringify(value)) {
      return false
    }
  }
  return true
}

/**
 * Issued by trusted authority (usually the one handling invocation) that attest
 * that specific UCAN delegation has been considered authentic.
 *
 * @see https://github.com/web3-storage/specs/blob/main/w3-session.md#authorization-session
 * 
 * @example
 * ```js
 * {
    iss: "did:web:web3.storage",
    aud: "did:key:z6Mkk89bC3JrVqKie71YEcc5M1SMVxuCgNx6zLZ8SYJsxALi",
    att: [{
      "with": "did:web:web3.storage",
      "can": "ucan/attest",
      "nb": {
        "proof": {
          "/": "bafyreifer23oxeyamllbmrfkkyvcqpujevuediffrpvrxmgn736f4fffui"
        }
      }
    }],
    exp: null
    sig: "..."
  }
 * ```
 */
export const session = capability({
  can: 'ucan/attest',
  // Should be web3.storage DID
  with: Schema.DID,
  nb: Schema.struct({
    // UCAN delegation that is being attested.
    proof: Schema.link(),
  }),
})

export const claim = capability({
  can: 'access/claim',
  with: DID.match({ method: 'key' }).or(DID.match({ method: 'mailto' })),
})

// https://github.com/web3-storage/specs/blob/main/w3-access.md#accessdelegate
export const delegate = capability({
  can: 'access/delegate',
  /**
   * Field MUST be a space DID with a storage provider. Delegation will be stored just like any other DAG stored using store/add capability.
   *
   * @see https://github.com/web3-storage/specs/blob/main/w3-access.md#delegate-with
   */
  with: DID.match({ method: 'key' }),
  nb: Schema.struct({
    // keys SHOULD be CIDs, but we won't require it in the schema
    /**
     * @type {Schema.Schema<AccessDelegateDelegations>}
     */
    delegations: Schema.dictionary({
      value: Schema.Link.match(),
    }),
  }),
  derives: (claim, proof) => {
    return (
      fail(equalWith(claim, proof)) ||
      fail(subsetsNbDelegations(claim, proof)) ||
      true
    )
  },
})

/**
 * @typedef {Schema.Dictionary<string, Types.Link<unknown, number, number, 0 | 1>>} AccessDelegateDelegations
 */

/**
 * Parsed Capability for access/delegate
 *
 * @typedef {object} ParsedAccessDelegate
 * @property {string} can
 * @property {object} nb
 * @property {AccessDelegateDelegations} [nb.delegations]
 */

/**
 * returns whether the claimed ucan is proves by the proof ucan.
 * both are access/delegate, or at least have same semantics for `nb.delegations`, which is a set of delegations.
 * checks that the claimed delegation set is equal to or less than the proven delegation set.
 * usable with {import('@ucanto/interface').Derives}.
 *
 * @param {ParsedAccessDelegate} claim
 * @param {ParsedAccessDelegate} proof
 */
function subsetsNbDelegations(claim, proof) {
  const missingProofs = setDifference(
    delegatedCids(claim),
    new Set(delegatedCids(proof))
  )
  if (missingProofs.size > 0) {
    return new Failure(
      `unauthorized nb.delegations ${[...missingProofs].join(', ')}`
    )
  }
  return true
}

/**
 * iterate delegated UCAN CIDs from an access/delegate capability.nb.delegations value.
 *
 * @param {ParsedAccessDelegate} delegate
 * @returns {Iterable<string>}
 */
function* delegatedCids(delegate) {
  for (const d of Object.values(delegate.nb.delegations || {})) {
    yield d.toString()
  }
}

/**
 * @template S
 * @param {Iterable<S>} minuend - set to subtract from
 * @param {Set<S>} subtrahend - subtracted from minuend
 */
function setDifference(minuend, subtrahend) {
  /** @type {Set<S>} */
  const difference = new Set()
  for (const e of minuend) {
    if (!subtrahend.has(e)) {
      difference.add(e)
    }
  }
  return difference
}
