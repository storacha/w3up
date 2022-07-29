import { mf, serviceAuthority, test } from './helpers/setup.js'
import * as UCAN from '@ipld/dag-ucan'
import { SigningAuthority } from '@ucanto/authority'

test.before((t) => {
  t.context = { mf }
})

test('should fail with no header', async (t) => {
  const { mf } = t.context
  const res = await mf.dispatchFetch('http://localhost:8787/raw', {
    method: 'POST',
  })
  const rsp = await res.json()
  t.deepEqual(rsp, {
    error: { code: 'HTTP_ERROR', message: 'bearer missing.' },
  })
  t.is(res.status, 400)
})

test('should fail with bad ucan', async (t) => {
  const { mf } = t.context

  const res = await mf.dispatchFetch('http://localhost:8787/raw', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ss`,
    },
  })
  t.is(res.status, 400)
  const rsp = await res.json()
  t.deepEqual(rsp, {
    error: {
      code: 'HTTP_ERROR',
      message: 'Invalid JWT.',
      cause:
        "Can't parse UCAN: ss: Expected JWT format: 3 dot-separated base64url-encoded values.",
    },
  })
})

test('should fail with 0 caps', async (t) => {
  const { mf } = t.context

  const kp = await SigningAuthority.generate()

  const ucan = await UCAN.issue({
    issuer: kp,
    audience: serviceAuthority,
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
      message: 'Invocation is required to have one single capability.',
      capabilities: [],
    },
  ])
})

test('should fail with bad service audience', async (t) => {
  const { mf } = t.context

  const kp = await SigningAuthority.generate()
  const audience = await SigningAuthority.generate()
  const ucan = await UCAN.issue({
    issuer: kp,
    audience,
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
      name: 'InvalidAudience',
      error: true,
      audience: serviceAuthority.did(),
      delegation: {
        audience: audience.did(),
      },
      message: `Delegates to '${audience.did()}' instead of '${serviceAuthority.did()}'`,
    },
  ])
})

test('should fail with with more than 1 cap', async (t) => {
  const { mf } = t.context

  const kp = await SigningAuthority.generate()
  const ucan = await UCAN.issue({
    issuer: kp,
    audience: serviceAuthority,
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
      message: 'Invocation is required to have one single capability.',
      capabilities: [
        { can: 'identity/validate', with: 'mailto:admin@dag.house' },
        { can: 'identity/register', with: 'mailto:admin@dag.house' },
      ],
    },
  ])
})

test('should route to handler', async (t) => {
  const { mf } = t.context

  const kp = await SigningAuthority.generate()
  const ucan = await UCAN.issue({
    issuer: kp,
    audience: serviceAuthority,
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

test('should handle exception in route handler', async (t) => {
  const { mf } = t.context

  const kp = await SigningAuthority.generate()
  const ucan = await UCAN.issue({
    issuer: kp,
    audience: serviceAuthority,
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
