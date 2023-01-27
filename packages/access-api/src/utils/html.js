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
  <title>Web3 Storage</title>
  <meta name="description" content="">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@acab/reset.css">
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
    :where(:root) body {
      display: grid;
      height: 100vh;
      height: 100dvh;
      padding: 0;
      margin: 0;
      max-width: 100%;
    }
    body {
      margin: 0 40px;
      padding: 40px 0;
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

    .box {
      max-width: 640px;
      background-color: var(--background-alt);
      padding: 20px;
      margin: 1em 0;
      border-radius: 6px;
      overflow: hidden;
    }
    .box > p {
      margin-bottom: 10px;
    }
    .box > p:last-child {
      margin-bottom: 0;
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
 * @param {object} props
 * @param {boolean} [props.autoApprove]
 */
export const PendingValidateEmail = ({ autoApprove }) => (
  <div class="fcenter">
    <img
      src="https://web3.storage/android-chrome-512x512.png"
      height="80"
      width="80"
    />
    <div>
      <h1>Validating Email</h1>
      <form id="approval" method="post" class="fcenter">
        <button class="mcenter">Approve</button>
      </form>
      {autoApprove ? (
        <script
          dangerouslySetInnerHTML={{
            // NOTE: this script sticks to ES3-era syntax for compat with more browsers
            __html: `(function () {
            // auto-submit the form for any user w/JS enabled
            var form = document.getElementById('approval');
            form.style.display = 'none';
            form.submit();
          })();`,
          }}
        />
      ) : undefined}
    </div>
  </div>
)

/**
 *
 * @param {object} param0
 * @param {Ucanto.Delegation<[import('@web3-storage/capabilities/types').VoucherClaim]> | Ucanto.Delegation<[import('@web3-storage/capabilities/types').SpaceRecover]>} param0.delegation
 * @param {string} param0.ucan
 * @param {string} param0.qrcode
 */
export const ValidateEmail = ({ delegation, ucan, qrcode }) => (
  <div class="fcenter">
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
    <div class="box">
      <p>
        During the beta period, uploads via w3up will only appear via the beta
        APIs, and not on the web3.storage or NFT.Storage websites, even if the
        associated email addresses are the same.
      </p>
      <p>
        At the end of the beta period, web3.storage and NFT.Storage's upload
        APIs and existing accounts will be upgraded to use w3up. Uploads via the
        w3up beta be migrated to web3.storage by default and, if applicable,
        combined with the relevant existing web3.storage account (based on email
        address). If you would rather have your beta w3up account be associated
        with the NFT.Storage product (e.g., you are only storing off-chain NFT
        data), please email us at{' '}
        <a href="mailto:support@nft.storage">support@nft.storage</a>. All w3up
        uploads associated with a given registered email will only be able to be
        associated with one of either web3.storage or NFT.Storage when these
        uploads are migrated.
      </p>
    </div>
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
  <div class="fcenter">
    <img
      src="https://web3.storage/android-chrome-512x512.png"
      height="80"
      width="80"
    />
    <h1>Email Validation Failed</h1>
    <p>{msg} You may close this window and try again.</p>
  </div>
)
