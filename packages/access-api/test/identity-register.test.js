import * as UCAN from '@ipld/dag-ucan'
import { SigningAuthority } from '@ucanto/authority'
import { Delegation } from '@ucanto/core'
import { Accounts } from '../src/kvs/accounts.js'
import * as caps from '@web3-storage/access/capabilities'
import { connection, mf, serviceAuthority, test } from './helpers/setup.js'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'

test.before((t) => {
  t.context = { mf }
})

test('register', async (t) => {
  const kp = await SigningAuthority.generate()
  const con = connection(kp)

  const validate = caps.identityValidate.invoke({
    audience: serviceAuthority,
    issuer: kp,
    caveats: {
      as: 'mailto:hugo+register@dag.house',
    },
    with: kp.did(),
  })

  const out = await validate.execute(con)
  if (out?.error || !out) {
    return t.fail()
  }
  // @ts-ignore
  const ucan = UCAN.parse(
    // @ts-ignore
    out.delegation.replace('http://localhost:8787/validate?ucan=', '')
  )
  const root = await UCAN.write(ucan)
  const proof = Delegation.create({ root })

  const register = caps.identityRegister.invoke({
    audience: serviceAuthority,
    issuer: kp,
    // @ts-ignore
    with: proof.capabilities[0].with,
    caveats: {
      // @ts-ignore
      as: proof.capabilities[0].as,
    },
    proofs: [proof],
  })

  await register.execute(con)
  const invocation = await register.delegate()
  // @ts-ignore
  const accounts = new Accounts(await mf.getKVNamespace('ACCOUNTS'))

  const email = await accounts.get('mailto:hugo+register@dag.house')
  t.is(email?.proof, invocation.cid.toString())

  const did = await accounts.get(kp.did())
  t.is(did?.proof, invocation.cid.toString())
})

test('identify', async (t) => {
  const kp = await SigningAuthority.generate()
  const con = connection(kp)

  const validate = caps.identityValidate.invoke({
    audience: serviceAuthority,
    issuer: kp,
    caveats: {
      as: 'mailto:hugo+identify@dag.house',
    },
    with: kp.did(),
  })

  const out = await validate.execute(con)
  if (out?.error || !out) {
    return
  }
  /** @type {Types.UCAN.JWT<import('@web3-storage/access/types').IdentityRegister>} */
  // @ts-ignore
  const jwt = out.delegation.replace('http://localhost:8787/validate?ucan=', '')
  const ucan = UCAN.parse(jwt)
  const root = await UCAN.write(ucan)
  /** @type {Types.Delegation<[import('@web3-storage/access/types').IdentityRegister]>} */
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
