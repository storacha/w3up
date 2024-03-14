import * as API from './types.js'
import * as Space from './space.js'
import * as Account from './account.js'
import * as Coupon from './coupon.js'
import * as Task from './task.js'

/**
 * Invocation is like an advanced Promise for the UCAN invocation result. When
 * awaited it is either resolved to `.out.ok` of the invocation receipt, or is
 * rejected with `.out.error`. Additionally it also provides `.receipt()` method
 * allowing you to await for the receipt instead. This gives you a convenient
 * default with an option to get receipt in more advanced cases.
 *
 * In addition invocation also implements {@link Task.Invocation} interface and
 * can be used in other tasks using `yield*` operator to either get unwrapped
 * result by default or `yield x.receipt()` to get the receipt instead.
 *
 * @template {{}} Ok
 * @template {Error} Err
 * @template {Error} Fail
 * @template {Task.Suspend | Task.Join | Task.Throw<Err|Fail>} Command
 * @implements {Task.Invocation<Ok, Err|Fail>}
 */
class Invocation {
  /**
   * @param {Task.Task<API.Receipt<Ok, Err>, Err|Fail, Command>} task
   */
  constructor(task) {
    this.invocation = Task.perform(task)
  }

  *[Symbol.iterator]() {
    const receipt = yield* this.invocation
    if (receipt.out.ok) {
      return /** @type {Ok} */ (receipt.out.ok)
    } else {
      throw receipt.out.error
    }
  }

  /**
   *
   * @param {unknown} reason
   */
  abort(reason) {
    return this.invocation.abort(reason)
  }

  receipt() {
    return this.invocation
  }

  /**
   * @returns {Promise<API.Result<Ok, Err|Fail>>}
   */
  result() {
    return this.invocation.then((receipt) => receipt.out)
  }

  /**
   * @type {Promise<Ok>['then']}
   */
  then(onFulfilled, onRejected) {
    return this.invocation
      .then((receipt) => {
        if (receipt.out.ok) {
          return receipt.out.ok
        } else {
          throw receipt.out.error
        }
      })
      .then(onFulfilled, onRejected)
  }

  /**
   * @type {Promise<Ok>['catch']}
   */
  catch(reject) {
    return this.then().catch(reject)
  }
  /**
   * @type {Promise<Ok>['finally']}
   */
  finally(onFinally) {
    return this.then().finally(onFinally)
  }

  [Symbol.toStringTag] = 'Invocation'
}

/**
 * Takes a session and UCAN invocation and executes it with the service session
 * is connected to. It returns an `Invocation` object that when awaited will
 * either resolve to the invocation result (receipt.out.ok) or fail with an
 * error (receipt.out.error). Returned invocation has `.receipt()` method that
 * can be awaited instead to get invocation receipt without unwrapping it.
 *
 * @template {API.Capability} C
 * @template {API.UnknownProtocol} [P=API.W3UpProtocol]
 * @param {API.Session<P>} session
 * @param {API.IssuedInvocationView<C>} invocation
 * @returns {API.TaskInvocation<API.InferReceiptOk<C, P>, API.InferReceiptError<C, P>, API.OfflineError>}

 */
export const execute = (session, invocation) =>
  /** @type {any} */ (perform(run(session, invocation)))

/**
 * @template {API.Capability} Capability
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} session
 * @param {API.IssuedInvocationView<Capability>} invocation
 * @returns {Task.Task<API.InferReceipt<Capability, Protocol>, API.OfflineError>}
 */
function* run(session, invocation) {
  if (!session.connection.channel) {
    return yield* Task.fail(
      new OfflineError('Session has no service connection')
    )
  }

  const [receipt] = yield* Task.wait(
    session.connection.execute(
      /** @type {API.IssuedInvocationView<Capability> & API.ServiceInvocation<Capability, Protocol>} */ (
        invocation
      )
    )
  )

  return receipt
}

/**
 * Spawns a task that returns a UCAN receipt, and succeeds with either `.out.ok`
 * or fails with `.out.error`. Other than unwrapping the receipt it is almost
 * identical to {@link Task.spawn}, except returned `Invocation` object also
 * provides `.receipt()` method that gives access to an unwrapped receipt in
 * cases where that is desired.
 *
 * @template {{}} Ok
 * @template {Error} Err
 * @template {Error} Fail
 * * @template {Task.Suspend | Task.Join | Task.Throw<Fail>} Command
 * @param {() => Task.Task<API.Receipt<Ok, Err>, Fail, Command>} work
 */
export const spawn = (work) => perform(work())

/**
 * @template {API.Capability} Capability
 * @template {API.UnknownProtocol} Protocol
 * @template {API.Receipt} Receipt
 * @template {Error} Fail
 * @template {Task.Suspend | Task.Join | Task.Throw<Fail>} Command
 * @param {Task.Task<Receipt, Fail, Command>} task
 * @returns {API.TaskInvocation<API.InferReceiptOk<Capability, Protocol, Receipt>, API.InferReceiptError<Capability, Protocol, Receipt>, Exclude<Task.InferError<Command>, Task.AbortError>>}
 */
export const perform = (task) =>
  /** @type {API.TaskInvocation<*, *, any>} */ (new Invocation(task))

/**
 * @implements {API.OfflineError}
 */
class OfflineError extends Error {
  name = /** @type {const} */ ('OfflineError')
}

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 * @param {API.Session<Protocol>} model
 * @returns {API.W3UpSession<Protocol>}
 */
export const create = (model) =>
  new Session(/** @type {API.Session<any>} */ (model))

/**
 * @template {API.UnknownProtocol} [Protocol=API.W3UpProtocol]
 * @implements {API.Session<Protocol>}
 */
class Session {
  /**
   * @param {API.Session<Protocol>} model
   */
  constructor(model) {
    this.model = model
    this.spaces = Space.view(/** @type {API.Session<any>} */ (this.model))
    this.accounts = Account.view(/** @type {API.Session<any>} */ (this.model))
    this.coupons = Coupon.view(/** @type {API.Session<any>} */ (this.model))
  }
  get connection() {
    return this.model.connection
  }
  get agent() {
    return /** @type {API.AgentView} */ (this.model.agent)
  }
}
