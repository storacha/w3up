/* eslint-disable no-constant-condition */
/* eslint-disable require-yield */
import * as Task from './task/task.js'
import { SUSPEND, RESUME } from './task/task.js'

export * from './task/task.js'

/**
 * @template T
 * @param {unknown|PromiseLike<T>} value
 * @returns {value is PromiseLike<T>}
 */
const isPromiseLike = (value) =>
  value != null &&
  typeof (/** @type {{then?:unknown}} */ (value).then) === 'function'

/**
 * Takes a `Promise` value and returns a task that suspends until the promise
 * is resolved and then returns the resolved value. If you pass a non-promise
 * value it will return it back immediately, however typescript inference may
 * get confused.
 *
 * @template U
 * @param {U} source
 * @returns {Task.Task<Awaited<U>>}
 */
export function* wait(source) {
  if (isPromiseLike(source)) {
    const invocation = yield* fork(suspend())
    let ok
    void source.then(
      (out) => {
        ok = out
        invocation.abort(RESUME)
      },
      (error) => {
        if (error instanceof AbortError) {
          invocation.abort(error.reason)
        } else {
          invocation.abort(error)
        }
      }
    )

    yield* invocation

    return /** @type {any} */ (ok)
  } else {
    return /** @type {any} */ (source)
  }
}

/**
 * Returns a task that is suspended for a given duration in milliseconds.
 *
 * @param {number} duration
 * @returns {Task.Task<void>}
 */
export const sleep = function* (duration) {
  let id = null
  try {
    const invocation = yield* fork(suspend())
    id = setTimeout(() => invocation.abort(RESUME), duration)
    yield* invocation
  } finally {
    if (id != null) {
      clearTimeout(id)
    }
  }
}

export const ok = Object.assign(
  /**
   * Takes a {@link Task.Result} value and returns a task that return `ok` value of
   * the successful result or throws the `error` of the failed result.
   *
   * @template {unknown} Ok
   * @template {{}} Fail
   * @param {Task.Result<Ok, Fail>} source
   * @returns {Task.Task<Ok & {}, Fail>}
   */
  function* ok(source) {
    const { ok, error } = yield* wait(source)
    if (ok) {
      return ok
    } else {
      throw error
    }
  },
  {
    /**
     * Takes a `Promise` of the {@link Task.Result} value and returns a task that
     * return `ok` value of the successful result or throws the `error` of the
     * failed result. It suspends the task until the promise is resolved.
     *
     * @template {unknown} Ok
     * @template {unknown} Fail
     * @param {PromiseLike<Task.Result<Ok, Fail>>} source
     * @returns {Task.Task<Ok & {}, Fail & {}>}
     */
    *wait(source) {
      const result = yield* wait(source)
      if (result.ok) {
        return result.ok
      } else {
        throw result.error
      }
    },
  }
)

/**
 * @template {globalThis.Error} Error
 * @param {Error} error
 * @returns {Task.Task<never, Error>}
 */
export const fail = function* (error) {
  throw error
}

/**
 * Spawns a concurrent task and returns a
 *
 * @template Ok
 * @template {globalThis.Error} Fail
 * @template {Task.Suspend|Task.Join|Task.Throw<Fail>} Command
 * @param {() => Task.Task<Ok, Fail, Command>} work
 * @returns {Task.Invocation<Ok, Task.InferError<Command>>}
 */
export const spawn = (work) => perform(work())

/**
 * @template Ok
 * @template {globalThis.Error} Fail
 * @template {Task.Suspend|Task.Join|Task.Throw<Fail>} Command
 * @param {Task.Task<Ok, Fail, Command>} task
 * @returns {Task.Invocation<Ok, Task.InferError<Command>>}
 */
export const perform = (task) =>
  /** @type {Task.Invocation<Ok, Task.InferError<Command>>} */ (
    new Invocation(/** @type {Task.Task<Ok, Fail, Command>} */ (task))
  )

/**
 * @template Ok
 * @template {globalThis.Error} Fail
 * @template {Task.Suspend|Task.Join|Task.Throw<Fail>} Command
 * @param {Task.Task<Ok, Fail, Command>} task
 * @returns {Task.Task<Task.Invocation<Ok, Task.InferError<Command>>>}
 */
export function* fork(task) {
  return perform(task)
}

/**
 * @returns {Task.Task<void>}
 */
export function* suspend() {
  try {
    while (true) {
      yield SUSPEND
    }
  } catch (cause) {
    if (/** @type {Task.AbortError} */ (cause).reason !== RESUME) {
      throw cause
    }
  }
}

/**
 * @template Ok
 * @template {globalThis.Error} Fail
 * @template {Task.Suspend|Task.Join|Task.Throw<Fail>} Command
 * @implements {Task.Task<Ok, Fail, Command>}
 */
class Continue {
  /**
   *
   * @param {Task.Execution<Ok, Command>} task
   */
  constructor(task) {
    this.task = task
  }
  [Symbol.iterator]() {
    return this.task
  }
}

/**
 * @template Ok
 * @template {globalThis.Error} Fail
 * @template {Task.Suspend|Task.Join|Task.Throw<Fail>} [Command=Task.Suspend|Task.Join|Task.Throw<Fail>]
 * @implements {Task.Invocation<Ok, Fail>}
 * @implements {Task.Execution<Ok, Command>}
 * @implements {Task.Join}
 * @implements {Promise<Ok>}
 */
class Invocation {
  /**
   * @param {Task.Task<Ok, Fail, Command>} task
   */
  constructor(task) {
    /** @type {Array<Task.Suspend|Task.Throw<Fail>>} */
    this.queue = []

    this.job = task[Symbol.iterator]()
    /** @type {Promise<Ok>} */
    this.outcome = new Promise((succeed, fail) => {
      this.succeed = succeed
      this.fail = fail
    })

    /** @type {Task.Wake} */
    this.group = this

    // start a task execution on next tick
    setImmediate(() => this.resume(), null)
  }

  /**
   * @returns {Task.Step<Ok, Command>}
   */
  next() {
    const { job, queue } = this
    const command = queue.shift()
    if (!command) {
      return job.next()
    } else if (command === SUSPEND) {
      return { done: false, value: /** @type {Command} */ (SUSPEND) }
    } else if ('throw' in /** @type {Task.Throw} */ (command)) {
      return job.throw(/** @type {Task.InferError<Command>} */ (command.throw))
    } else {
      throw new TypeError('Invalid command')
    }
  }

  /**
   * @param {Ok} ok
   * @returns
   */
  return(ok) {
    return this.job.return(ok)
  }

  /**
   *
   * @param {Task.InferError<Command>} error
   * @returns {Task.Step<Ok, Command>}
   */
  throw(error) {
    this.queue.push(/** @type {any} */ ({ throw: error }))
    return this.next()
  }

  wake() {
    if (this.group === this) {
      this.resume()
    } else {
      this.group.wake()
    }
  }

  resume() {
    while (true) {
      try {
        const state = this.next()
        if (state.done) {
          return this.succeed(state.value)
        } else if (state.value === SUSPEND) {
          return
        } else if (state.value?.join) {
          state.value.join(this)
        } else if (state.value?.throw) {
          this.throw(
            /** @type {Task.InferError<Command>} */ (state.value.throw)
          )
        } else {
          throw new RangeError('Invalid command')
        }
      } catch (error) {
        return this.fail(error)
      }
    }
  }

  /**
   * @type {Promise<Ok>['then']}
   */
  then(resolve, reject) {
    return this.outcome.then(resolve, reject)
  }
  /**
   * @type {Promise<Ok>['catch']}
   */
  catch(reject) {
    return this.outcome.catch(reject)
  }
  /**
   * @type {Promise<Ok>['finally']}
   */
  finally(onFinally) {
    return this.outcome.finally(onFinally)
  }

  [Symbol.toStringTag] = 'TaskInvocation'

  /**
   * @returns {Task.Invocation<Task.Result<Ok, Task.InferError<Command>>>}
   */
  result() {
    return perform(
      wait(
        this.then(
          (ok) => ({ ok }),
          (error) => ({ error })
        )
      )
    )
  }

  /**
   *
   * @param {unknown} reason
   */
  abort(reason) {
    this.queue.push(
      /** @type {Task.Throw<Fail>} */ ({
        throw: new AbortError(reason),
      })
    )
    this.wake()
  }

  /**
   * @param {Task.Wake} group
   */
  join(group) {
    this.group = group
  }

  /**
   * Joins the task into the currently running task.
   *
   * @returns {Task.Execution<Ok, Command>}
   */
  *[Symbol.iterator]() {
    // eslint-disable-next-line jsdoc/no-undefined-types
    yield /** @type {Command} */ (/** @type {Task.Join} */ (this))
    // We wrap this in a `Continue` because yield* will call [Symbol.iterator]
    // to get an iterator to iterate over. We wrap it in a `Continue` to avoid
    // infinite loop.
    return yield* new Continue(this)
  }
}

export class AbortError extends Error {
  /**
   * @param {unknown} reason
   */
  constructor(reason) {
    super(`Task was aborted\n${String(reason)}`)
    this.reason = reason
  }
  name = /** @type {const} */ ('AbortError')
}

/** @type {<T>(callback: (context:T) => void, context:T) => unknown} */
const setImmediate =
  /* c8 ignore next */
  globalThis.setImmediate || ((fn, arg) => Promise.resolve(arg).then(fn))
