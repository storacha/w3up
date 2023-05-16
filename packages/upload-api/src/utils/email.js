/**
 * @typedef { import("../types").ValidationEmailSend } ValidationEmailSend
 */

export const debug = () => new DebugEmail()

/**
 * This is API compatible version of Email class that can be used during
 * tests and debugging.
 */
export class DebugEmail {
  constructor() {
    this.emails = /** @type {ValidationEmailSend[]} */ ([])
  }
  /**
   * Send validation email with ucan to register
   *
   * @param {ValidationEmailSend} opts
   */
  async sendValidation(opts) {
    try {
      this.emails.push(opts)
    } catch {
      // eslint-disable-next-line no-console
      console.log('email.sendValidation', opts)
    }
  }

  async take() {
    return this.emails.shift()
  }
}

