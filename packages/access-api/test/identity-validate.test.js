import {
  serviceAuthority,
  mf,
  test,
  send,
  connection,
} from './helpers/setup.js'
import * as UCAN from '@ipld/dag-ucan'
import { SigningAuthority } from '@ucanto/authority'
import * as caps from '@web3-storage/w3access/capabilities'

test.before((t) => {
  t.context = { mf }
})

test.skip('should route to validate without ucanto client', async (t) => {
  const kp = await SigningAuthority.generate()

  const ucan = await UCAN.issue({
    issuer: kp,
    audience: serviceAuthority,
    capabilities: [
      {
        can: 'identity/validate',
        with: kp.did(),
        as: 'mailto:admin@dag.house',
      },
    ],
  })
  const res = await send(ucan)
  t.deepEqual(res.ok, true)
})

test.skip('should fail with bad scheme', async (t) => {
  const kp = await SigningAuthority.generate()
  const ucan = await UCAN.issue({
    issuer: kp,
    audience: serviceAuthority,
    capabilities: [{ can: 'identity/validate', with: 'mailt:admin@dag.house' }],
  })
  const res = await send(ucan)
  const rsp = await res.json()
  t.deepEqual(rsp, [
    {
      error: true,
      name: 'Unauthorized',
      message:
        `Encountered malformed 'identity/validate' capability: {"can":"identity/validate","with":"mailt:admin@dag.house"}\n` +
        '  - Expected did: URI instead got mailt:admin@dag.house',
      cause: {
        error: true,
        name: 'MalformedCapability',
        message:
          `Encountered malformed 'identity/validate' capability: {"can":"identity/validate","with":"mailt:admin@dag.house"}\n` +
          '  - Expected did: URI instead got mailt:admin@dag.house',
      },
    },
  ])
})

test('should route correctly to identity/validate', async (t) => {
  const kp = await SigningAuthority.generate()
  const con = connection(kp)

  const validate = caps.identityValidate.invoke({
    audience: serviceAuthority,
    issuer: kp,
    caveats: {
      as: 'mailto:hugo@dag.house',
    },
    with: kp.did(),
  })

  const out = await validate.execute(con)
  if (out?.error || !out) {
    return t.fail()
  }
  const ucan = UCAN.parse(
    // @ts-ignore
    out.delegation.replace('http://localhost:8787/validate?ucan=', '')
  )
  t.is(ucan.audience.did(), kp.did())
  t.is(ucan.issuer.did(), serviceAuthority.did())
  t.deepEqual(ucan.capabilities, [
    { can: 'identity/register', with: 'mailto:hugo@dag.house', as: kp.did() },
  ])
})

// test('should route correctly to identity/validate and fail with proof', async (t) => {
//   const { mf } = t.context
//   const kp = await ucans.EdKeypair.create()
//   const rootUcan = await ucans.build({
//     audience: kp.did(),
//     issuer: serviceKp,
//     capabilities: [
//       {
//         can: { namespace: 'identity', segments: ['validate'] },
//         with: { scheme: 'mailto', hierPart: '*' },
//       },
//     ],
//     lifetimeInSeconds: 100,
//   })
//   const ucan = await ucans.build({
//     audience: serviceKp.did(),
//     issuer: kp,
//     capabilities: [
//       {
//         can: { namespace: 'identity', segments: ['validate'] },
//         with: { scheme: 'mailto', hierPart: 'alice@mail.com' },
//       },
//     ],
//     lifetimeInSeconds: 100,
//     proofs: [ucans.encode(rootUcan)],
//   })
//   const res = await mf.dispatchFetch('http://localhost:8787', {
//     method: 'POST',
//     headers: {
//       Authorization: `Bearer ${ucans.encode(ucan)}`,
//     },
//   })
//   const rsp = await res.json()
//   t.deepEqual(rsp, {
//     ok: false,
//     error: { code: 'Error', message: 'Invalid capability' },
//   })
// })
