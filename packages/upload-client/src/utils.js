import { isDelegation } from '@ucanto/core'

/**
 * @template T
 * @param {ReadableStream<T> | NodeJS.ReadableStream} readable
 * @returns {AsyncIterable<T>}
 */
export function toIterable(readable) {
  // @ts-expect-error
  if (readable[Symbol.asyncIterator] != null) return readable

  // Browser ReadableStream
  if ('getReader' in readable) {
    return (async function* () {
      const reader = readable.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) return
          yield value
        }
      } finally {
        reader.releaseLock()
      }
    })()
  }

  throw new Error('unknown stream')
}

/**
 * @template T
 * @param {AsyncIterable<T>|Iterable<T>} collectable
 * @returns {Promise<T[]>}
 */
export async function collect(collectable) {
  const chunks = []
  for await (const chunk of collectable) chunks.push(chunk)
  return chunks
}

/**
 * @param {import('@ucanto/interface').Proof[]} proofs
 * @param {import('@ucanto/interface').Ability} ability
 * @param {import('@ucanto/interface').DID} [audience]
 */
export function findCapability(proofs, ability, audience) {
  let capability
  for (const proof of proofs) {
    if (!isDelegation(proof)) continue
    if (audience != null && proof.audience.did() !== audience) continue
    capability = proof.capabilities.find((c) =>
      capabilityMatches(c.can, ability)
    )
    if (capability) break
  }
  if (!capability) {
    throw new Error(
      `Missing proof of delegated capability "${ability}" for audience "${audience}"`
    )
  }
  return capability
}

/**
 * @param {string} can
 * @param {import('@ucanto/interface').Ability} ability
 */
function capabilityMatches(can, ability) {
  return can === ability
    ? true
    : can.endsWith('*') && ability.startsWith(can.split('*')[0])
}
