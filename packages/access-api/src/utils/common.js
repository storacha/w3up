/**
 *
 * @param {unknown} obj
 * @returns {obj is Record<string, unknown>}
 */
export function isObject(obj) {
  return typeof obj === 'object' && obj !== null
}

/**
 *
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value)
  )
}

/**
 * @param {unknown} value
 * @returns {value is Date}
 */
export function isDate(value) {
  const objectTypeName = toString.call(value).slice(8, -1)

  return objectTypeName === 'Date'
}

/**
 *
 * @param {unknown} value
 * @returns {value is Buffer}
 */
export function isBuffer(value) {
  // @ts-ignore
  return value?.constructor?.isBuffer?.(value) ?? false
}
