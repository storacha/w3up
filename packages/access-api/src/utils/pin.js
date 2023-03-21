/* eslint-disable unicorn/no-null */
/* eslint-disable no-nested-ternary */

/**
 * Generates a random pin code of the given length (at most 9 digits) that can
 * be mapped to a lock 3x3 grid lock pattern like this:
 *
 * ```
 * 0 1 2
 * 3 4 5
 * 6 7 8
 * ```
 *
 * Generated pin codes will never contain the same digit twice and will never
 * lead to a pattern where one of the dots is crossed without being part of the
 * pin.
 *
 * @param {number} [length=6]
 * @returns {number[]}
 */
export const generate = (length = 6) => {
  const size = Math.min(length, 9)
  // Allocate a buffer for 32 random bytes from which we will derive the pin
  // Our pin will never be longer than 9 digits, but we may not be able to use
  // every byte so we generate extra.
  const bytes = new Uint8Array(32)

  // We will collect digits for the pin code here.
  const pin = []
  // We will keep track of the digits we have already used here
  // to avoid duplicates in the pin as it would lead to unclear
  // lock patterns
  const visited = new Set()

  // Loop until we have collected enough digits for the pin.
  while (pin.length < size) {
    // We fill the buffer with random bytes
    crypto.getRandomValues(bytes)
    // and iterate over them attempting to derive digits for the pin
    // if digit is already in the pin or if it leads to an overlapping
    // pattern we skip it and consider next byte.
    for (const byte of bytes) {
      // Map the random values to the numbers 0 to 8
      const digit = byte % 9
      // If this is the first digit we include it in the pin
      const conflict =
        pin.length === 0
          ? false
          : // If we have already used this digit we skip it
          // otherwise same dot will be used twice in the pattern
          visited.has(digit)
          ? true
          : // If the digit is leading to a pattern with a line crossing
            // dot that is not part of the pin we skip it
            CONFLICT[pin[pin.length - 1]][digit] != null

      if (!conflict) {
        visited.add(digit)
        pin.push(digit)
      }

      // If we already have enough digits we can stop here
      if (pin.length === size) {
        break
      }
    }
  }

  return pin
}

/**
 * To ensue that the pin code does not lead to a lock pattern where one of the
 * dots is crossed without being part of the pin we define conflicting digit
 * sequences. For example, if we had a pin `0 2 5 8` it would produce a lock
 * pattern where digit `1` is crossed by the line connecting `0` and `2` which
 * is why `CONFLICT[0][2] === 1`.
 *
 * ```
 * ╋┅╋┅╋
 * 3 4 ╋
 * 6 7 ╋
 * ```
 *
 * @type {Record<number, Record<number, number|undefined>>}
 */
const CONFLICT = {
  0: { 2: 1, 6: 3, 8: 4 },
  1: { 7: 4 },
  2: { 0: 1, 6: 4, 8: 5 },
  3: { 5: 4 },
  4: {},
  5: { 3: 4 },
  6: { 0: 3, 2: 4, 8: 7 },
  7: { 1: 4 },
  8: { 0: 4, 2: 5, 6: 7 },
}
