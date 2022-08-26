/**
 * @param {{ to: string; url: string; token: string }} opts
 */
export async function sendEmail(opts) {
  const rsp = await fetch('https://api.postmarkapp.com/email/withTemplate', {
    method: 'POST',
    headers: {
      Accept: 'text/json',
      'Content-Type': 'text/json',
      'X-Postmark-Server-Token': opts.token,
    },
    body: JSON.stringify({
      From: 'noreply@dag.house',
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
  const out = await rsp.json()

  if (out.Message !== 'OK') {
    throw new Error(JSON.stringify(out))
  }
}
