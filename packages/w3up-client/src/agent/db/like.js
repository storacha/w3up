/**
 * Compiles DB like pattern into regular expression.
 *
 * @param {{raw: ArrayLike<string>}} template
 * @param  {...unknown} substitutions
 */
export const like = (template, ...substitutions) =>
  new RegExp(
    String.raw(template, ...substitutions)
      .replaceAll('%', '[\\s\\s]*')
      .replaceAll('_', '[\\s\\s]{1}')
  )
