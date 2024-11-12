import Process from 'node:child_process'
import { TextDecoder } from 'node:util'
import { ByteStream } from './stream.js'

/**
 * @typedef {object} Command
 * @property {string} program
 * @property {string[]} args
 * @property {Record<string, string|undefined>} env
 *
 * @typedef {object} Outcome
 * @property {Status} status
 * @property {string} output
 * @property {string} error
 *
 *
 * @param {string} program
 */
export const create = (program) =>
  new CommandView({
    program,
    args: [],
    env: process.env,
  })

class CommandView {
  /**
   * @param {Command} model
   */
  constructor(model) {
    this.model = model
  }

  /**
   * @param {string[]} args
   */
  args(args) {
    return new CommandView({
      ...this.model,
      args: [...this.model.args, ...args],
    })
  }

  /**
   * @param {Record<string, string|undefined>} env
   */
  env(env) {
    return new CommandView({
      ...this.model,
      env: { ...this.model.env, ...env },
    })
  }

  fork() {
    return fork(this.model)
  }

  join() {
    return join(this.model)
  }
}

/**
 * @param {Command} command
 */
export const fork = (command) => {
  const process = Process.spawn(command.program, command.args, {
    env: command.env,
  })
  return new Fork(process)
}

/**
 * @param {Command} command
 */
export const join = (command) => fork(command).join()

class Status {
  /**
   * @param {{code:number, signal?: void}|{signal:NodeJS.Signals, code?:void}} model
   */
  constructor(model) {
    this.model = model
  }

  success() {
    return this.model.code === 0
  }

  get code() {
    return this.model.code ?? null
  }
  get signal() {
    return this.model.signal ?? null
  }
}

class Fork {
  /**
   * @param {Process.ChildProcess} process
   */
  constructor(process) {
    this.process = process
    this.output = ByteStream.from(process.stdout ?? [])

    this.error = ByteStream.from(process.stderr ?? [])
  }
  join() {
    return new Join(this)
  }
  terminate() {
    this.process.kill()
    return this
  }
}

class Join {
  /**
   * @param {Fork} fork
   */
  constructor(fork) {
    this.fork = fork
    this.output = ''
    this.error = ''

    void readInto(fork.output.reader(), this, 'output')
    void readInto(fork.error.reader(), this, 'error')
  }

  /**
   * @param {(ok: Outcome) => unknown} succeed
   * @param {(error: Outcome) => unknown} fail
   */
  then(succeed, fail) {
    this.fork.process.once('close', (code, signal) => {
      const status =
        signal !== null
          ? new Status({ signal })
          : new Status({ code: /** @type {number} */ (code) })

      const { output, error } = this
      const outcome = { status, output, error }
      if (status.success()) {
        succeed(outcome)
      } else {
        fail(
          Object.assign(
            new Error(`command failed with status ${status.code}\n ${error}`),
            outcome
          )
        )
      }
    })
  }

  /**
   * @returns {Promise<Outcome>}
   */
  catch() {
    return Promise.resolve(this).catch((error) => error)
  }
}

/**
 * @template {string} Channel
 * @param {AsyncIterable<Uint8Array>} source
 * @param {{[key in Channel]: string}} output
 * @param {Channel} channel
 */
const readInto = async (source, output, channel) => {
  const decoder = new TextDecoder()
  for await (const chunk of source) {
    // Uncomment to debugger easily
    // console.log(decoder.decode(chunk))
    output[channel] += decoder.decode(chunk)
  }
}
