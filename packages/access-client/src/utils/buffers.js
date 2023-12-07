/**
 * Convert a Uint8Array to an ArrayBuffer, taking into account
 * that we may be looking at a "data view".
 * thanks, https://stackoverflow.com/a/54646864
 * 
 * If we aren't looking at a data view, simply returns the underlying ArrayBuffer
 * directly.
 *
 * @param {Uint8Array} array
 * @returns ArrayBuffer
 */
export function uint8ArrayToArrayBuffer(array) {
  if ((array.byteOffset === 0) && (array.byteLength === array.buffer.byteLength)) {
    return array.buffer
  } else {
    return array.buffer.slice(
      array.byteOffset,
      array.byteLength + array.byteOffset
    )
  }
}