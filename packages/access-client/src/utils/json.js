// JSON.stringify and JSON.parse with URL, Map and Uint8Array type support.

/**
 * @param {string} k
 * @param {any} v
 */
export const replacer = (k, v) => {
  if (v instanceof URL) {
    return { $url: v.toString() }
  } else if (v instanceof Map) {
    return { $map: [...v.entries()] }
  } else if (v instanceof Uint8Array) {
    return { $bytes: [...v.values()] }
  } else if (v?.type === 'Buffer' && Array.isArray(v.data)) {
    return { $bytes: v.data }
  }
  return v
}

/**
 * @param {string} k
 * @param {any} v
 */
export const reviver = (k, v) => {
  if (!v) return v
  if (v.$url) return new URL(v.$url)
  if (v.$map) return new Map(v.$map)
  if (v.$bytes) return new Uint8Array(v.$bytes)
  return v
}

/**
 * @param {any} value
 * @param {number|string} [space]
 */
export const stringify = (value, space) =>
  JSON.stringify(value, replacer, space)

/** @param {string} value */
export const parse = (value) => JSON.parse(value, reviver)
