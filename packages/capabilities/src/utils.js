import { DID, Schema, fail, ok } from '@ucanto/validator'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'

import { equals } from 'uint8arrays/equals'

// e.g. did:web:web3.storage or did:web:staging.web3.storage
export const ProviderDID = DID.match({ method: 'web' })

export const SpaceDID = DID.match({ method: 'key' })

export const AccountDID = DID.match({ method: 'mailto' })

export const Await = Schema.struct({
  'ucan/await': Schema.tuple([Schema.string(), Schema.link()]),
})

/**
 * Check URI can be delegated.
 *
 * @param {string} [child]
 * @param {string} [parent]
 */
export function canDelegateURI(child, parent) {
  if (parent === undefined) {
    return ok({})
  }
  if (child !== undefined && parent.endsWith('*')) {
    return child.startsWith(parent.slice(0, -1))
      ? ok({})
      : fail(`${child} does not match ${parent}`)
  }

  return child === parent
    ? ok({})
    : fail(`${child} is different from ${parent}`)
}

/**
 * Checks that `with` on claimed capability is the same as `with`
 * in delegated capability. Note this will ignore `can` field.
 *
 * @param {Types.ParsedCapability} child
 * @param {Types.ParsedCapability} parent
 */
export function equalWith(child, parent) {
  return child.with === parent.with
    ? ok({})
    : fail(`Can not derive ${child.can} with ${child.with} from ${parent.with}`)
}

/**
 * @param {unknown} child
 * @param {unknown} parent
 * @param {string} constraint
 */
export function equal(child, parent, constraint) {
  if (parent === undefined || parent === '*') {
    return ok({})
  } else if (String(child) === String(parent)) {
    return ok({})
  } else {
    return fail(
      `Constrain violation: ${child} violates imposed ${constraint} constraint ${parent}`
    )
  }
}

/**
 * @template {Types.ParsedCapability<"store/add"|"store/get"|"store/remove", Types.URI<'did:'>, {link?: Types.Link<unknown, number, number, 0|1>}>} T
 * @param {T} claimed
 * @param {T} delegated
 * @returns {Types.Result<{}, Types.Failure>}
 */
export const equalLink = (claimed, delegated) => {
  if (claimed.with !== delegated.with) {
    return fail(
      `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
    )
  } else if (
    delegated.nb.link &&
    `${delegated.nb.link}` !== `${claimed.nb.link}`
  ) {
    return fail(
      `Link ${claimed.nb.link ? `${claimed.nb.link}` : ''} violates imposed ${
        delegated.nb.link
      } constraint.`
    )
  } else {
    return ok({})
  }
}

/**
 * @template {Types.ParsedCapability<"space/blob/add"|"space/blob/remove"|"web3.storage/blob/allocate"|"web3.storage/blob/accept", Types.URI<'did:'>, {blob: { digest: Uint8Array, size: number }}>} T
 * @param {T} claimed
 * @param {T} delegated
 * @returns {Types.Result<{}, Types.Failure>}
 */
export const equalBlob = (claimed, delegated) => {
  if (claimed.with !== delegated.with) {
    return fail(
      `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
    )
  } else if (
    delegated.nb.blob.digest &&
    !equals(delegated.nb.blob.digest, claimed.nb.blob.digest)
  ) {
    return fail(
      `Link ${
        claimed.nb.blob.digest ? `${claimed.nb.blob.digest}` : ''
      } violates imposed ${delegated.nb.blob.digest} constraint.`
    )
  } else if (
    claimed.nb.blob.size !== undefined &&
    delegated.nb.blob.size !== undefined
  ) {
    return claimed.nb.blob.size > delegated.nb.blob.size
      ? fail(
          `Size constraint violation: ${claimed.nb.blob.size} > ${delegated.nb.blob.size}`
        )
      : ok({})
  } else {
    return ok({})
  }
}

/**
 * @template {Types.ParsedCapability<"http/put", Types.URI<'did:'>, {body: { digest: Uint8Array, size: number }}>} T
 * @param {T} claimed
 * @param {T} delegated
 * @returns {Types.Result<{}, Types.Failure>}
 */
export const equalBody = (claimed, delegated) => {
  if (claimed.with !== delegated.with) {
    return fail(
      `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
    )
  } else if (
    delegated.nb.body.digest &&
    !equals(delegated.nb.body.digest, claimed.nb.body.digest)
  ) {
    return fail(
      `Link ${
        claimed.nb.body.digest ? `${claimed.nb.body.digest}` : ''
      } violates imposed ${delegated.nb.body.digest} constraint.`
    )
  } else if (
    claimed.nb.body.size !== undefined &&
    delegated.nb.body.size !== undefined
  ) {
    return claimed.nb.body.size > delegated.nb.body.size
      ? fail(
          `Size constraint violation: ${claimed.nb.body.size} > ${delegated.nb.body.size}`
        )
      : ok({})
  } else {
    return ok({})
  }
}

/**
 * @template {Types.ParsedCapability<"blob/add"|"blob/remove"|"blob/allocate"|"blob/accept"|"http/put", Types.URI<'did:'>, {content: Uint8Array}>} T
 * @param {T} claimed
 * @param {T} delegated
 * @returns {Types.Result<{}, Types.Failure>}
 */
export const equalContent = (claimed, delegated) => {
  if (claimed.with !== delegated.with) {
    return fail(
      `Expected 'with: "${delegated.with}"' instead got '${claimed.with}'`
    )
  } else if (
    delegated.nb.content &&
    !equals(delegated.nb.content, claimed.nb.content)
  ) {
    return fail(
      `Link ${
        claimed.nb.content ? `${claimed.nb.content}` : ''
      } violates imposed ${delegated.nb.content} constraint.`
    )
  } else {
    return ok({})
  }
}

/**
 * Checks that `claimed` {@link Types.Link} meets an `imposed` constraint.
 *
 * @param {Types.UnknownLink} claimed
 * @param {Types.UnknownLink|undefined} imposed
 * @param {string} at
 * @returns {Types.Result<{}, Types.Failure>}
 */
export const checkLink = (claimed, imposed, at) => {
  return equal(
    String(claimed),
    imposed === undefined ? undefined : String(imposed),
    at
  )
}

/**
 * @template T
 * @param {Types.Result<T , Types.Failure>} result
 * @returns {{error: Types.Failure, ok?:undefined}|undefined}
 */
export const and = (result) => (result.error ? result : undefined)

/**
 *
 * @param {import('@ucanto/interface').Ability} ability
 */
function parseAbility(ability) {
  const [namespace, ...segments] = ability.split('/')
  return { namespace, segments }
}

/**
 *
 * TODO: needs to account for caps derived from different namespaces like 'account/info' can be derived from 'store/add'
 *
 * @param {import('@ucanto/interface').Ability} parent
 * @param {import('@ucanto/interface').Ability} child
 */
export function canDelegateAbility(parent, child) {
  const parsedParent = parseAbility(parent)
  const parsedChild = parseAbility(child)

  // Parent is wildcard
  if (parsedParent.namespace === '*' && parsedParent.segments.length === 0) {
    return true
  }

  // Child is wild card so it can not be delegated from anything
  if (parsedChild.namespace === '*' && parsedChild.segments.length === 0) {
    return false
  }

  // namespaces don't match
  if (parsedParent.namespace !== parsedChild.namespace) {
    return false
  }

  // given that namespaces match and parent first segment is wildcard
  if (parsedParent.segments[0] === '*') {
    return true
  }

  // Array equality
  if (parsedParent.segments.length !== parsedChild.segments.length) {
    return false
  }

  // all segments must match
  return parsedParent.segments.reduce(
    (acc, v, i) => acc && parsedChild.segments[i] === v,
    true
  )
}
