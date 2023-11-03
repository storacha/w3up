export * from '@ucanto/core/result'
import * as API from '@ucanto/interface'

/**
 * @template T
 * @template {{}} X
 * @param {API.Result<T, X>} result
 * @param {string} [message]
 * @returns {T}
 */
export const expect = ({ ok, error }, message) => {
  if (error) {
    const exception = message
      ? new Error(message, {
          cause: error,
        })
      : error
    throw exception
  } else {
    return /** @type {T} */ (ok)
  }
}
