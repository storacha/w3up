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

  /**
   * Send email
   *
   * @param {object} opts
   * @param {string} opts.to
   * @param {string} opts.textBody
   * @param {string} opts.subject
   *
   */
  async send({ to, textBody, subject }) {
    const rsp = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        From: this.sender,
        To: to,
        TextBody: textBody,
        Subject: subject,
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
  /**
   * Send validation email with ucan to register
   *
   * @param {ValidationEmailSend} opts
   */
  async sendValidation(opts) {
    try {
      // @ts-expect-error
      globalThis.email.sendValidation(opts)
    } catch {
      // eslint-disable-next-line no-console
      console.log('email.sendValidation', opts)
    }
  }

  /**
   * Send email
   *
   * @param {object} opts
   * @param {string} opts.to
   * @param {string} opts.textBody
   * @param {string} opts.subject
   *
   */
  async send(opts) {
    try {
      // @ts-expect-error
      globalThis.email.send(opts)
    } catch {
      // eslint-disable-next-line no-console
      console.log('email.send', opts)
    }
  }
}
