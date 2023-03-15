import * as UCAN from '@ipld/dag-ucan'
import { Signer } from '@ucanto/principal/ed25519'
import { context } from './helpers/context.js'
import assert from 'assert'

/** @type {typeof assert} */
const t = assert
const test = it

describe('ucan', function () {
  /** @type {Awaited<ReturnType<typeof context>>} */
  let ctx
  beforeEach(async function () {
    ctx = await context()
  })
  it('should fail with no header', async function () {
    const { mf } = ctx
    const res = await mf.dispatchFetch('http://localhost:8787/raw', {
      method: 'POST',
    })
    const rsp = await res.json()
    t.deepEqual(rsp, {
      error: {
        code: 'HTTP_ERROR',
        message: 'The required "Authorization: Bearer" header is missing.',
      },
    })
    t.strictEqual(res.status, 400)
  })

  it('should fail with bad ucan', async function () {
    const { mf } = ctx

    const res = await mf.dispatchFetch('http://localhost:8787/raw', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ss`,
      },
    })
    t.strictEqual(res.status, 401)
    const rsp = await res.json()
    t.deepEqual(rsp, {
      error: {
        code: 'HTTP_ERROR',
        message: 'Malformed UCAN headers data.',
        cause:
          "ParseError: Can't parse UCAN: ss: Expected JWT format: 3 dot-separated base64url-encoded values.",
      },
    })
  })

  test('should fail with 0 caps', async function () {
    const { mf, service, issuer } = ctx

    const ucan = await UCAN.issue({
      issuer,
      audience: service,
      // @ts-ignore
      capabilities: [],
    })
    const res = await mf.dispatchFetch('http://localhost:8787/raw', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UCAN.format(ucan)}`,
      },
    })
    const rsp = await res.json()
    t.deepEqual(rsp, [
      {
        name: 'InvocationCapabilityError',
        error: true,
        message: 'Invocation is required to have a single capability.',
        capabilities: [],
      },
    ])
  })

  test('should fail with with more than 1 cap', async function () {
    const { mf, service, issuer } = ctx

    const ucan = await UCAN.issue({
      issuer,
      audience: service,
      capabilities: [
        { can: 'identity/validate', with: 'mailto:admin@dag.house' },
        { can: 'identity/register', with: 'mailto:admin@dag.house' },
      ],
    })
    const res = await mf.dispatchFetch('http://localhost:8787/raw', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UCAN.format(ucan)}`,
      },
    })
    const rsp = await res.json()
    t.deepEqual(rsp, [
      {
        name: 'InvocationCapabilityError',
        error: true,
        message: 'Invocation is required to have a single capability.',
        capabilities: [
          { can: 'identity/validate', with: 'mailto:admin@dag.house' },
          { can: 'identity/register', with: 'mailto:admin@dag.house' },
        ],
      },
    ])
  })

  test('should route to handler', async function () {
    const { mf, issuer, service } = ctx

    const ucan = await UCAN.issue({
      issuer,
      audience: service,
      capabilities: [{ can: 'testing/pass', with: 'mailto:admin@dag.house' }],
    })
    const res = await mf.dispatchFetch('http://localhost:8787/raw', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UCAN.format(ucan)}`,
      },
    })
    const rsp = await res.json()
    t.deepEqual(rsp, ['test pass'])
  })

  test('should support ucan invoking to a did:web aud', async function () {
    const serviceDidWeb = 'did:web:example.com'
    const { mf, issuer, service } = await context({
      env: {
        ...process.env,
        DID: serviceDidWeb,
      },
    })
    const ucan = await UCAN.issue({
      issuer,
      audience: service.withDID(serviceDidWeb),
      capabilities: [{ can: 'testing/pass', with: 'mailto:admin@dag.house' }],
    })
    const res = await mf.dispatchFetch('http://localhost:8787/raw', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UCAN.format(ucan)}`,
      },
    })
    const rsp = await res.json()
    t.deepEqual(rsp, ['test pass'])
  })

  test('should handle exception in route handler', async function () {
    const { mf, service, issuer } = ctx

    const ucan = await UCAN.issue({
      issuer,
      audience: service,
      capabilities: [{ can: 'testing/fail', with: 'mailto:admin@dag.house' }],
    })
    const res = await mf.dispatchFetch('http://localhost:8787/raw', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UCAN.format(ucan)}`,
      },
    })
    const rsp = await res.json()
    t.deepEqual(
      rsp[0].message,
      'service handler {can: "testing/fail"} error: test fail'
    )
  })

  test('should fail with missing proofs', async function () {
    const { mf, service } = ctx

    const alice = await Signer.generate()
    const bob = await Signer.generate()
    const proof1 = await UCAN.issue({
      issuer: alice,
      audience: bob,
      capabilities: [{ can: 'testing/pass', with: 'mailto:admin@dag.house' }],
    })

    const proof2 = await UCAN.issue({
      issuer: alice,
      audience: bob,
      capabilities: [{ can: 'testing/pass', with: 'mailto:admin@dag.house' }],
    })
    const cid1 = await UCAN.link(proof1)
    const cid2 = await UCAN.link(proof2)
    const ucan = await UCAN.issue({
      issuer: bob,
      audience: service,
      capabilities: [{ can: 'testing/pass', with: 'mailto:admin@dag.house' }],
      proofs: [cid1, cid2],
    })

    const res = await mf.dispatchFetch('http://localhost:8787/raw', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UCAN.format(ucan)}`,
      },
    })
    const rsp = await res.json()
    t.deepEqual(rsp, {
      error: {
        code: 'HTTP_ERROR',
        message: 'Missing Proofs',
        cause: {
          prf: [cid1.toString(), cid2.toString()],
        },
      },
    })
  })

  test('should multiple invocation should pass', async function () {
    const { mf, service } = ctx

    const alice = await Signer.generate()
    const bob = await Signer.generate()
    const proof1 = await UCAN.issue({
      issuer: alice,
      audience: bob,
      capabilities: [{ can: 'testing/pass', with: 'mailto:admin@dag.house' }],
    })

    const cid1 = await UCAN.link(proof1)
    const ucan1 = await UCAN.issue({
      issuer: bob,
      audience: service,
      capabilities: [{ can: 'testing/pass', with: 'mailto:admin@dag.house' }],
      proofs: [cid1],
    })

    const ucan2 = await UCAN.issue({
      issuer: bob,
      audience: service,
      capabilities: [{ can: 'testing/pass', with: 'mailto:admin@dag.house' }],
      proofs: [cid1],
    })

    const headers = new Headers()
    headers.append('Authorization', `Bearer ${UCAN.format(ucan1)}`)
    headers.append('Authorization', `Bearer ${UCAN.format(ucan2)}`)
    headers.append('ucan', `${cid1.toString()} ${UCAN.format(proof1)}`)

    const res = await mf.dispatchFetch('http://localhost:8787/raw', {
      method: 'POST',
      headers: Object.fromEntries(headers.entries()),
    })

    const rsp = await res.json()
    t.deepEqual(rsp, ['test pass', 'test pass'])
  })
})
