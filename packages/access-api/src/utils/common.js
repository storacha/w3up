/**
 *
 * @param {unknown} obj
 * @returns {obj is Record<string, unknown>}
 */
export function isObject(obj) {
  return typeof obj === 'object' && obj !== null
}
