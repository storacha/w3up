import * as API from '@ucanto/interface'

/**
 * @template T
 * @param {unknown|PromiseLike<T>} value
 * @returns {value is PromiseLike<T>}
 */
const isPromiseLike = (value) =>
  value != null &&
  typeof (/** @type {{then?:unknown}} */ (value).then) === 'function'

/**
 * @typedef {PromiseLike<void>} Wait
 */

/**
 * @template T
 * @param {API.Await<T>} source
 * @returns {Generator<Wait, T, void>}
 */
export const wait = function* (source) {
  if (isPromiseLike(source)) {
    let ok
    yield source.then((value) => {
      ok = value
    })
    return /** @type {T} */ (ok)
  } else {
    return source
  }
}

/**
 * @template {API.Result} R
 * @param {API.Await<R>} source
 * @returns {Generator<Wait|R, R['ok'] & {}>}
 */
export const join = function* (source) {
  const { ok, error } = yield* wait(source)
  if (ok) {
    return ok
  } else {
    throw error
  }
}

/**
 * @template {API.Result} R
 * @template {{}} Ok
 * @template {globalThis.Error} [Error=never]
 * @param {() => Generator<R|Wait, API.Result<Ok, Error>, void>} task
 * @returns {Promise<API.Result<Ok, (R['error'] & {}) | Error>>}
 */
export const execute = async (task) => {
  const process = task()
  let state = process.next()
  try {
    while (!state.done) {
      if (isPromiseLike(state.value)) {
        await state.value
        state = process.next()
      } else if (state.value.error) {
        return state.value
      } else {
        state = process.next()
      }
    }
    return state.value
  } catch (cause) {
    return { error: /** @type {Error} */ (cause) }
  }
}

/**
 * @template {API.Result} R
 * @template {{}} Ok
 * @template {globalThis.Error} [Error=never]
 * @param {() => Generator<R|Wait, API.Result<Ok, Error>, void>} task
 */
export const perform = async (task) => {
  const result = await execute(task)
  if (result.ok) {
    return result.ok
  }
  throw result.error
}
