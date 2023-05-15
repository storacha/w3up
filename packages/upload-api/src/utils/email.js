export const debug = () => new DebugEmail()

/**
 * @typedef ValidationEmailSend
 * @property {string} to
 * @property {string} url
 */

/**
 * @param {{token:string, sender?:string}} opts
 */
export const configure = (opts) => new Email(opts)

// TODO: move this out to w3infra
export class Email {
  /**
   * @param {object} opts
   * @param {string} opts.token
   * @param {string} [opts.sender]
   */
  constructor(opts) {
    this.sender = opts.sender || 'web3.storage <noreply@web3.storage>'
    this.headers = {
      Accept: 'text/json',
      'Content-Type': 'text/json',
      'X-Postmark-Server-Token': opts.token,
    }
  }

  /**
   * Send validation email with ucan to register
   *
   * @param {ValidationEmailSend} opts
   */
  async sendValidation(opts) {
    const rsp = await fetch('https://api.postmarkapp.com/email/withTemplate', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        From: this.sender,
        To: opts.to,
        TemplateAlias: 'welcome',
        TemplateModel: {
          product_url: 'https://web3.storage',
          product_name: 'Web3 Storage',
          email: opts.to,
          action_url: opts.url,
        },
      }),
    })

    if (!rsp.ok) {
      throw new Error(
        `Send email failed with status: ${
          rsp.status
        }, body: ${await rsp.text()}`
      )
    }
  }
}

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
