export class Email {
  /**
   *
   * @param {object} opts
   * @param {string} opts.token
   */
  constructor(opts) {
    this.headers = {
      Accept: 'text/json',
      'Content-Type': 'text/json',
      'X-Postmark-Server-Token': opts.token,
    }
  }

  /**
   * Send validation email with ucan to register
   *
   * @param {{ to: string; url: string, space: string }} opts
   */
  async sendValidation(opts) {
    const rsp = await fetch('https://api.postmarkapp.com/email/withTemplate', {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        From: 'web3.storage <noreply@dag.house>',
        To: opts.to,
        TemplateAlias: 'welcome',
        TemplateModel: {
          product_url: 'https://web3.storage',
          product_name: 'Web3 Storage',
          email: opts.to,
          action_url: opts.url,
          space_did: opts.space,
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
        From: 'web3.storage <noreply@dag.house>',
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
