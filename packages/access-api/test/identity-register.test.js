import * as UCAN from '@ipld/dag-ucan'
import { SigningAuthority } from '@ucanto/authority'
import { Delegation } from '@ucanto/core'
import { Accounts } from '../src/kvs/accounts.js'
import * as caps from '../src/ucanto/capabilities.js'
import { connection, mf, serviceAuthority, test } from './helpers/setup.js'

test.before((t) => {
  t.context = { mf }
})

test('register', async (t) => {
  const con = connection()
  const kp = await SigningAuthority.generate()

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
  const ucan = UCAN.parse(out.delegation)
  const root = await UCAN.write(ucan)
  /** @type {import('@ucanto/interface').Delegation<[import('../src/ucanto/capabilities.js').IdentityRegister]>} */
  const proof = Delegation.create({ root })

  const register = caps.identityRegister.invoke({
    audience: serviceAuthority,
    issuer: kp,
    with: proof.capabilities[0].with,
    caveats: {
      as: proof.capabilities[0].as,
    },
    proofs: [proof],
  })

  await register.execute(con)
  const invocation = await register.delegate()
  // @ts-ignore
  const accounts = new Accounts(await mf.getKVNamespace('ACCOUNTS'))

  const email = await accounts.get('mailto:hugo@dag.house')
  t.is(email?.proof, invocation.cid.toString())

  const did = await accounts.get(kp.did())
  t.is(did?.proof, invocation.cid.toString())
})

test('identify', async (t) => {
  const con = connection()
  const kp = await SigningAuthority.generate()

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
    return
  }
  const ucan = UCAN.parse(out.delegation)
  const root = await UCAN.write(ucan)

  /** @type {import('@ucanto/interface').Delegation<[{can: "identity/register", as: `did:${string}`, with: `mailto:${string}`}]>} */
  const proof = Delegation.create({ root })

  const register = caps.identityRegister.invoke({
    audience: serviceAuthority,
    issuer: kp,
    with: proof.capabilities[0].with,
    caveats: {
      as: proof.capabilities[0].as,
    },
    proofs: [proof],
  })

  await register.execute(con)

  const identify = caps.identityIdentify.invoke({
    audience: serviceAuthority,
    issuer: kp,
    with: kp.did(),
  })

  const identifyResult = await identify.execute(con)
  if (identifyResult?.error || !identifyResult) {
    return t.fail()
  }
  // @ts-ignore
  const accounts = new Accounts(await mf.getKVNamespace('ACCOUNTS'))
  const did = await accounts.get(kp.did())
  t.is(did?.account, identifyResult)
})
