import { render } from 'preact-render-to-string'
// eslint-disable-next-line no-unused-vars
import * as Ucanto from '@ucanto/interface'

/**
 * Build HTML document
 *
 * @param {string} body
 */
export function buildDocument(body) {
  return `
<!doctype html>
<html class="no-js" lang="">

<head>
  <meta charset="utf-8">
  <title></title>
  <meta name="description" content="">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/dark.min.css">
  <style>
    :root {
      --background-body: hsl(212deg 27% 17%);
      --background: hsl(212deg 27% 12%);
      --background-alt: hsl(212deg 27% 14%);
      --button-base: hsl(212deg 27% 10%);
      --button-hover: hsl(212deg 27% 6%);
      --scrollbar-thumb: hsl(212deg 27% 10%);
      --scrollbar-thumb-hover: hsl(212deg 27% 6%);
    }
    .fcenter {
      display: flex;
      align-items: center;
      flex-direction: column;
      justify-content: center;
    }
    .mcenter {
      margin: 0 auto;
    }
  </style>
</head>
<body>
${body}
</body>
</html>`
}

export class HtmlResponse extends Response {
  /**
   *
   * @param {import('preact').VNode<{}>} body
   * @param {ResponseInit} [init]
   */
  constructor(body, init = {}) {
    const headers = {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    }
    super(buildDocument(render(body)), { ...init, ...headers })
  }

  /**
   * @param {import('preact').VNode<{}>} body
   * @param {ResponseInit} [init]
   */
  static respond(body, init = {}) {
    return new HtmlResponse(body, init)
  }
}

/**
 *
 * @param {object} param0
 * @param {Ucanto.Delegation<[import('@web3-storage/capabilities/types').VoucherClaim]> | Ucanto.Delegation<[import('@web3-storage/capabilities/types').SpaceRecover]>} param0.delegation
 * @param {string} param0.ucan
 * @param {string} param0.qrcode
 */
export const ValidateEmail = ({ delegation, ucan, qrcode }) => (
  <div class="fcenter" style={{ height: '90vh', margin: '0 40px' }}>
    <img
      src="https://web3.storage/android-chrome-512x512.png"
      height="80"
      width="80"
    />
    <h1>Email Validated</h1>
    <p>
      {delegation.capabilities[0].nb.identity.replace('mailto:', '')} was
      confirmed. You may close this window.
    </p>
    <details style={{ maxWidth: '80vw', overflow: 'overlay' }}>
      {' '}
      <summary>More details</summary>
      <h5>Validation requested by:</h5>
      <p>
        <code>{delegation.audience.did()}</code>
      </p>
      <h5>QR Code:</h5>
      <div
        dangerouslySetInnerHTML={{
          __html: qrcode,
        }}
        class="mcenter"
        style={{
          width: '300px',
        }}
      />
      <h5>UCAN:</h5>
      <pre>
        <code>{ucan}</code>
      </pre>
    </details>
  </div>
)

/**
 *
 * @param {object} param0
 * @param {string} param0.msg
 */
export const ValidateEmailError = ({ msg }) => (
  <div class="fcenter" style={{ height: '90vh', margin: '0 40px' }}>
    <img
      src="https://web3.storage/android-chrome-512x512.png"
      height="80"
      width="80"
    />
    <h1>Email Validation Failed</h1>
    <p>{msg} You may close this window and try again.</p>
  </div>
)
