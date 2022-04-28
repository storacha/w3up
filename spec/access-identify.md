## `access/identify`

Upload protocol defines [access/identify][] capability which is very flexible yet powerful so it can be very confusing. This document attempts to wolk through some user stories to try and clarify.

#### identify with email

"Accounting" service MAY delegate to other "verifier" service(s) to do out of band user verification e.g. sign-in via email link style flow.

To do so the _accounting_ service must delegate a capability to a _verifier_ service which will allow it to:

1. Create accounts under the `did:email:` namespace.
2. Associate other DIDs with accounts under `did:email:` namespace.

**Accounting must trust the verifier service. A malicious verifier could get control of other accounts.**

```js
// The account service signs this with it's key, and sends it to the verifier service
{
  issuer: "did:key:zAccount",
  audience: "did:key:zVerify",
  capabilities: [
    {
      can: "access/identify",
      with: "did:email:*"
    }
  ]
}
```

Alice uses an example service _web3.app_. On first load, the app generates a keypair for Alice locally, and encodes the public key as `did:key:zAlice` DID. 

_web3.app_ supports email login through the `did:key:zVerify` service. When Alice provides an email address, the app will send a request to `did:key:zVerify`.

```js
// web3.app signs this with Alice's key and sends it to the verifier service
{
  issuer: "did:key:zAlice",
  audience: "did:key:zVerify",
  capabilities: [
    {
      can: "access/identify",
      with: "mailto:a@li.ce"
    }
  ]
}
```

Verifier service `did:key:zVerify` will delegate capability it got from `did:key:zAccount` to `did:key:zAlice` and embed it in a confiramtion emali link

```js
{
  issuer: "did:key:zVerify",
  audience: "did:key:zAlice",
  capabilities: [
    {
      can: "access/identify",
      with: "did:email:a@li.ce"
    }
  ],
  "proofs": [
    {
      issuer: "did:key:zAccount",
      audience: "did:key:zVerify",
      capabilities: [
        {
          can: "access/identify",
          with: "did:email:*"
        }
      ]
    }
  ]
}
```

Email link takes Alice back to web3.app which extracts embedded UCAN delegation which it invokes to register `did:key:zAlice` with `did:key:zAccount`.

```js
{
  issuer: "did:key:zAlice",
  audience: "did:key:zAccount",
  capabilities: [
    {
      can: "access/identify",
      with: "did:email:a@li.ce"
    }
  ],
  proofs: [
    {
      issuer: "did:key:zVerify",
      audience: "did:key:zAlice",
      capabilities: [
        {
          can: "access/identify",
          with: "did:email:a@li.ce",
        }
      ],
      proofs: [
        {
          issuer: "did:key:zAccount",
          audience: "did:key:zVerify",
          capabilities: [
            {
              can: "access/identify",
              with: "did:email:*",
            }
          ]
        }
      ]
    }
  ]
}
```

When accounting service receives this invocation they check they verify that `did:key:zAlice` can identify with `a@li.ce` by verifying proof chains and perform following steps

1. Registers an account for her with a root did that is derived from the CID of the received invocation token `did:did:bafy..ali`
2. Links `did:email:a@li.ce` to account DID `did:did:bafy..ali`
3. Links `did:key:zAlice` to account DID `did:did:bafy..ali`

:::info
Derived root DID is used to allow Alice unlink `did:key:zAlice` and `did:email:a@li.ce` in the future e.g. if her key or email gets compromised
:::

### Wallet auth

Mobile version of web3.app offers wallet based auth so on her phone Alice chooses to use that option. On first run app generates new did `did:key:zAli` and then asks wallet to sign ucan issued from account corresponding to `did:ethr:0xAl1ce`

```js
{
  issuer: "did:ethr:0xAl1ce",
  audience: "did:key:zAli",
  capabilities: [
    {
      can: "access/identify",
      with: "did:ethr:0xAl1ce",
    }
  ]
}
```

web3.app then invokes issued capability in order to register new did with `did:key:zAccount`:

```js
{
  issuer: "did:key:zAli",
  audience: "did:key:zAccount",
  capabilities: [
    {
      can: "access/identify",
      with: "did:ethr:0xAl1ce",
    }
  ],
  proofs: [
    {
      issuer: "did:ethr:0xAl1ce",
      audience: "did:key:zAli",
      capabilities: [
        {
          can: "access/identify",
          with: "did:ethr:0xAl1ce",
        }
      ]
    }
  ]
}
```

When service receives the request

1. It can verify that root token was issued by the walled account.
2. That `did:key:zAli` was delegated capability
3. Since system does not have account for neither `did:ethr:0xAl1ce` nor `did:key:zAli` it creates new account `did:did:bafy..l1z` and links those DID with it.

### Merging Acounts

However Alice does not wants a separate account from the one she had on her laptop. Therefor Alice uses "link account" web3.app feature. Mobile app asks Alice to activate linking on other device and scan displayed QR code from her phone.

When alice activates linking on her laptop web3.app

1. Generates new keypair corrsponding to `did:key:zLink`.
2. And delegates an `access/identify` capability for it.

```js
{
  issuer: "did:key:zAlice",
  audience: "did:key:zLink",
  capabilities: [
    {
      can: "access/identify",
      with: "did:key:zAlice",
    }
  ]
}
```

New private key + UCAN signature are encoded in QR code and renderred on the screen.

Alice scans QR code from her phone, allowing web3.app to gain control of `did:key:zALink` and capability to link with `did:key:zAlice`. So it invokes the capability:

```js
{
  issuer: "did:key:zAli",
  audience: "did:key:zAccount",
  capabilities: [
    {
      can: "access/identify",
      with: "did:key:zAlice",
    }
  ],
  proofs: [
    {
      issuer: "did:key:zLink",
      audience: "did:key:zAli",
      capabilities: [
        {
          can: "access/identify",
          with: "did:key:zAlice",
        }
      ],
      proofs: [
        {
          issuer: "did:key:zAlice",
          audience: "did:key:zLink",
          capabilities: [
            {
              can: "access/identify",
              with: "did:key:zAlice",
            }
          ]
        }
      ]
    }
  ]
}
```

When `did:key:zAccount` receives this invocation it can verify that `did:key:zAlice` authroized `zAli` to identify with `did:key:zAlice` through `zLink` so it proceeds:

1. Since `did:key:zAlice` is registered with `did:did:bafy..ali` account and `did:key:zAli` is registered with `did:did:bafy..l1z` two need to be merged so system creates new joint account derived from invocation cid `did:did:bafy..join`.
2. Relinks all dids from both `did:did:bafy..ali ` and `did:did:bafy..l1z` to new `did:did:bafy..join` ac

### identify with web proofs

Bob loads web3.app and on first run it generates local keypair `did:key:zb0b`. In order to allow storing data app needs to register account with `did:key:zAccount`. Bob chooses to use keybase.io inspired web proof based identification to start an account. He clicks "identify with twitter" link which instructs Bob to tweet following message and paste a link back

> I am also known as `did:key:zb0b`

Bob tweets the message and pastes link back into web3.app which in turn generates a following UCAN invocation:

```js
{
  issuer: "did:key:zb0b",
  audience: "did:key:zAccount",
  capabilities: [
    {
      can: "access/identify"
      with: "did:twitter:bob"
      proof: "https://twitter.com/bob/status/997184662995849216"
    }
  ]
}
```

`did:key:zAccount` receives invocation and verifies that:

1. Twitter user `@bob` authorized itself as `did:key:zb0b` by loading URL and checking that Bob claims to be also known as `did:key:zb0b`.
2. That issuer matches clamied `did:key:zb0b`.

And if all checks out it proceeds with account registration steps:

1. Derives account did from the invoction cid `did:did:bafy..6o6`.
2. Links `did:key:zbob` with account `did:did:bafy..6o6`.
3. Links `did:twitter:bob`

#### Key recovery

Bob looses access to the device with `did:key:zb0b` keypair. On a new device web3.app on first run generates new local keypair `did:key:zB06`. Bob repeats the same “identify with twitter” flow as before and app invokes new capability

```js
{
  issuer: "did:key:zB06",
  audience: "did:key:zAccount",
  capabilities: [
    {
      can: "access/identify"
      with: "did:twitter:bob"
      proof: "https://twitter.com/bob/status/11010011101101"
    }
  ]
}
```

`did:key:zAccount` receives invocation and verifies that:

1. Twitter user `@bob` authorized itself as `did:key:zB06` by loading URL and checking that Bob claims to be also known as `did:key:zB06`.
2. That issuer matches clamied `did:key:zB06`.

And if all checks out it proceeds with key registration steps:

1. Checks if `did:twitter:bob` is already associated with some account.
2. Since previous registration associated it with `did:did:bafy..6o6` new `did:key:zB06` key is linked to that account.

Now bob can use new device with existing account

[access/identify]: https://hackmd.io/UKf7w04kSzaQOGQenOofaQ#Identify
