// @ts-nocheck
import { predicates, objects } from 'friendly-words'

/**
 * Takes cryptographic hash and derives a human readable nickname from it. Note
 * that this is not a reversible operation. The nickname is not guaranteed to be
 * unique however the larger the word list in the vocabulary the less likely it
 * is that there will be a collision.
 *
 * @param {Uint8Array} hash
 * @param {Array<string[]>} [vocabulary]
 * @returns {string}
 */
export const toNickname = (hash, vocabulary = [predicates, objects]) =>
  toWords(hash, vocabulary).join('-')

/**
 * Takes cryptographic hash and derives a set of words from the given vocabulary.
 * Number of returned words will correspond to the number of words in the
 * vocabulary. Greater the number of words in each vocabulary list the less
 * likely it is that there will be a collision.
 *
 * @param {Uint8Array} hash
 * @param {Array<string[]>} vocabulary
 * @returns {string[]}
 */
export const toWords = (hash, vocabulary) => {
  const wordCount = vocabulary.length
  const sectionSize = Math.ceil(hash.length / wordCount)
  const nameParts = []

  for (const [index, words] of vocabulary.entries()) {
    const start = index * sectionSize
    const end = Math.min(start + sectionSize, hash.length)
    const wordIndex = combineBytes(hash.subarray(start, end), words.length)
    nameParts.push(words[wordIndex])
  }

  return nameParts
}

/**
 * Combine given bytes into a single number between 0 and `capacity`.
 *
 * @param {Uint8Array} bytes
 * @param {number} capacity
 */
export const combineBytes = (bytes, capacity) => {
  let combinedValue = 0
  for (const byte of bytes) {
    combinedValue = (combinedValue * 256 + byte) % capacity
  }

  return combinedValue
}
