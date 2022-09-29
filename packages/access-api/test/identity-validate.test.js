import { context, test } from './helpers/context.js'
import * as UCAN from '@ipld/dag-ucan'
import * as Identity from '@web3-storage/access/capabilities/identity'
import { send } from './helpers/utils.js'

test.before(async (t) => {
  t.context = await context()
})

test.skip('should route to validate without ucanto client', async (t) => {
  const { issuer, mf, service } = t.context

  const ucan = await UCAN.issue({
    issuer,
    audience: service,
    capabilities: [
      {
        can: 'identity/validate',
        with: issuer.did(),
        as: 'mailto:admin@dag.house',
      },
    ],
  })
  const res = await send(ucan, mf)
  t.deepEqual(res.ok, true)
})

test.skip('should fail with bad scheme', async (t) => {
  const { issuer, mf, service } = t.context
  const ucan = await UCAN.issue({
    issuer,
    audience: service,
    capabilities: [{ can: 'identity/validate', with: 'mailt:admin@dag.house' }],
  })
  const res = await send(ucan, mf)
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
  const { issuer, service, conn } = t.context

  const validate = Identity.validate.invoke({
    audience: service,
    issuer,
    nb: {
      as: 'mailto:hugo@dag.house',
    },
    with: issuer.did(),
  })

  const out = await validate.execute(conn)
  if (out?.error || !out) {
    return t.fail()
  }
  const ucan = UCAN.parse(
    // @ts-ignore
    out.delegation.replace('http://localhost:8787/validate?ucan=', '')
  )
  t.is(ucan.audience.did(), issuer.did())
  t.is(ucan.issuer.did(), service.did())
  t.deepEqual(ucan.capabilities, [
    {
      can: 'identity/register',
      with: 'mailto:hugo@dag.house',
      as: issuer.did(),
    },
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
