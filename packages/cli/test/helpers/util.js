/**
 * @param {{ raw: ArrayLike<string> }} template
 * @param {unknown[]} substitutions
 */
export const pattern = (template, ...substitutions) =>
  new RegExp(String.raw(template, ...substitutions))

/**
 * @param {RegExp} pattern
 * @param {string} source
 * @returns {string[]}
 */
export const match = (pattern, source) => {
  const match = source.match(pattern)
  if (!match) {
    return []
  }
  return match
}
