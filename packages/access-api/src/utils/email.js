/**
 * @param {{ to: string; url: string; token: string }} opts
 */
export async function sendEmail(opts) {
  const rsp = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'text/json',
      'Content-Type': 'text/json',
      'X-Postmark-Server-Token': opts.token,
    },
    body: JSON.stringify({
      From: 'noreply@dag.house',
      To: opts.to,
      Subject: 'Hello',
      HtmlBody: `<strong>Hello</strong><br/>Click <a href="${opts.url}"> here </a><hr/>`,
      MessageStream: 'outbound',
    }),
  })
  const out = await rsp.json()

  if (out.Message !== 'OK') {
    throw new Error(JSON.stringify(out))
  }
}
