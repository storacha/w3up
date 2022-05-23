import * as ucans from 'ucans'
import { bindings, mf, test } from './helpers/setup.js'

const serviceKp = ucans.EdKeypair.fromSecretKey(bindings._PRIVATE_KEY)

test.before((t) => {
  t.context = { mf }
})

test('should fail with now header', async (t) => {
  const { mf } = t.context
  const res = await mf.dispatchFetch('http://localhost:8787', {
    method: 'POST',
  })
  const rsp = await res.json()
  t.deepEqual(rsp, {
    ok: false,
    error: { code: 'Error', message: 'bearer missing.' },
  })
})

test('should fail with bad ucan', async (t) => {
  const { mf } = t.context

  const res = await mf.dispatchFetch('http://localhost:8787', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ss`,
    },
  })
  const rsp = await res.json()
  t.deepEqual(rsp, {
    ok: false,
    error: {
      code: 'Error',
      message:
        "Can't parse UCAN: ss: Expected JWT format: 3 dot-separated base64url-encoded values.",
    },
  })
})

test('should fail with 0 caps', async (t) => {
  const { mf } = t.context
  const kp = await ucans.EdKeypair.create()
  const ucan = await ucans.build({
    audience: serviceKp.did(),
    issuer: kp,
  })
  const res = await mf.dispatchFetch('http://localhost:8787', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ucans.encode(ucan)}`,
    },
  })
  const rsp = await res.json()
  t.deepEqual(rsp, {
    ok: false,
    error: { code: 'Error', message: 'invocation should have 1 cap.' },
  })
})

test('should fail with more than 1 cap', async (t) => {
  const { mf } = t.context
  const kp = await ucans.EdKeypair.create()
  const ucan = await ucans.build({
    audience: serviceKp.did(),
    issuer: kp,
    capabilities: [
      {
        can: { namespace: 'access', segments: ['identify'] },
        with: { scheme: 'mailto', hierPart: 'alice@mail.com' },
      },
      {
        can: { namespace: 'access', segments: ['identify'] },
        with: { scheme: 'mailto', hierPart: 'alice@mail.com' },
      },
    ],
  })
  const res = await mf.dispatchFetch('http://localhost:8787', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ucans.encode(ucan)}`,
    },
  })
  const rsp = await res.json()
  t.deepEqual(rsp, {
    ok: false,
    error: { code: 'Error', message: 'invocation should have 1 cap.' },
  })
})

test('should route correctly to access/identify', async (t) => {
  const { mf } = t.context
  const kp = await ucans.EdKeypair.create()
  const ucan = await ucans.build({
    audience: serviceKp.did(),
    issuer: kp,
    capabilities: [
      {
        can: { namespace: 'access', segments: ['identify'] },
        with: { scheme: 'mailto', hierPart: 'alice@mail.com' },
      },
    ],
    lifetimeInSeconds: 100,
  })
  const res = await mf.dispatchFetch('http://localhost:8787', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ucans.encode(ucan)}`,
    },
  })
  const rsp = await res.json()
  t.is(rsp.ok, true)
})

test('should route correctly to access/identify with proof', async (t) => {
  const { mf } = t.context
  const kp = await ucans.EdKeypair.create()
  const rootUcan = await ucans.build({
    audience: kp.did(),
    issuer: serviceKp,
    capabilities: [
      {
        can: { namespace: 'access', segments: ['identify'] },
        with: { scheme: 'mailto', hierPart: '*' },
      },
    ],
    lifetimeInSeconds: 100,
  })
  const ucan = await ucans.build({
    audience: serviceKp.did(),
    issuer: kp,
    capabilities: [
      {
        can: { namespace: 'access', segments: ['identify'] },
        with: { scheme: 'mailto', hierPart: 'alice@mail.com' },
      },
    ],
    lifetimeInSeconds: 100,
    proofs: [ucans.encode(rootUcan)],
  })
  const res = await mf.dispatchFetch('http://localhost:8787', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ucans.encode(ucan)}`,
    },
  })
  const rsp = await res.json()
  t.is(rsp.ok, true)
})
