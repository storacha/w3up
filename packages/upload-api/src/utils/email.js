/**
 * @typedef { import("../types.js").ValidationEmailSend } ValidationEmailSend
 */

export const debug = () => new DebugEmail()

const MAX_TAKE_RETRIES = 3

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
  /**
   *
   * @param {number} retries
   */
  async takeWithRetries(retries = MAX_TAKE_RETRIES) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    if (this.emails.length > 0 || retries <= 0) {
      return this.emails.shift()
    } else {
      return new Promise((resolve) => {
        setTimeout(() => resolve(self.takeWithRetries(retries - 1)), 100)
      })
    }
  }

  async take() {
    return this.takeWithRetries()
  }
}
