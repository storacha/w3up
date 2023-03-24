import { render } from 'preact-render-to-string'

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
 * @param {string} param0.ucan
 * @param {string} param0.email
 * @param {string} param0.audience
 * @param {string} [param0.qrcode]
 */
export const ValidateEmail = ({ ucan, qrcode, email, audience }) => (
  <div class="fcenter">
    <img
      src="https://user-images.githubusercontent.com/11778450/227402733-b2e4b175-b1a6-4a49-92ff-9ac4e247a695.png"
      height="100"
    />
    <h1>Email Validated</h1>
    <p>{email} was confirmed. You may close this window.</p>
    <div class="box">
      <p>
        If you have an existing non-w3up beta account with NFT.Storage or
        web3.storage and register for the w3up beta version of the same product
        (NFT.Storage or web3.storage) using the same email, then at the end of
        the beta period, these accounts will be combined. Until the beta period
        is over and this migration occurs, uploads to w3up will not appear in
        your NFT.Storage or web3.storage account (and vice versa), even if you
        register with the same email.
      </p>
      <p>
        By registering with either the web3.storage or the NFT.Storage w3up
        beta, you agree to the respective Terms of Service (
        <a href="https://console.web3.storage/terms">web3.storage ToS</a>,{' '}
        <a href="https://console.nft.storage/terms">NFT.Storage ToS</a>).
      </p>
    </div>
    <details style={{ maxWidth: '80vw', overflow: 'overlay' }}>
      {' '}
      <summary>More details</summary>
      <h5>Validation requested by:</h5>
      <p>
        <code>{audience}</code>
      </p>
      {qrcode && (
        <>
          <h5>QR Code:</h5>
          <div
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: qrcode,
            }}
            class="mcenter"
            style={{
              width: '300px',
            }}
          />
        </>
      )}
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
