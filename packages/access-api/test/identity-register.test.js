import * as UCAN from '@ipld/dag-ucan'
import { Delegation } from '@ucanto/core'
import * as Identity from '@web3-storage/access/capabilities/identity'
import { Accounts } from '../src/kvs/accounts.js'
import { context, test } from './helpers/context.js'
// eslint-disable-next-line no-unused-vars
import * as Types from '@ucanto/interface'

test.beforeEach(async (t) => {
  t.context = await context()
})

test('register', async (t) => {
  const { conn, issuer, mf, service } = t.context

  const validate = Identity.validate.invoke({
    audience: service,
    issuer,
    nb: {
      as: 'mailto:hugo+register@dag.house',
    },
    with: issuer.did(),
  })

  const out = await validate.execute(conn)
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

  const register = Identity.register.invoke({
    audience: service,
    issuer,
    // @ts-ignore
    with: proof.capabilities[0].with,
    nb: {
      // @ts-ignore
      as: proof.capabilities[0].as,
    },
    proofs: [proof],
  })

  await register.execute(conn)
  const invocation = await register.delegate()
  // @ts-ignore
  const accounts = new Accounts(await mf.getKVNamespace('ACCOUNTS'))

  const email = await accounts.get('mailto:hugo+register@dag.house')
  t.is(email?.proof, invocation.cid.toString())

  const did = await accounts.get(issuer.did())
  t.is(did?.proof, invocation.cid.toString())
})

test('identify', async (t) => {
  const { conn, issuer, mf, service } = t.context
  const validate = Identity.validate.invoke({
    audience: service,
    issuer,
    nb: {
      as: 'mailto:hugo+identify@dag.house',
    },
    with: issuer.did(),
  })

  const out = await validate.execute(conn)
  if (out?.error || !out) {
    return
  }
  /** @type {Types.UCAN.JWT<[import('@web3-storage/access/types').IdentityRegister]>} */
  // @ts-ignore
  const jwt = out.delegation.replace('http://localhost:8787/validate?ucan=', '')
  const ucan = UCAN.parse(jwt)
  const root = await UCAN.write(ucan)
  const proof = Delegation.create({ root })

  const register = Identity.register.invoke({
    audience: service,
    issuer,
    with: proof.capabilities[0].with,
    nb: {
      as: proof.capabilities[0].nb.as,
    },
    proofs: [proof],
  })

  await register.execute(conn)

  const identify = Identity.identify.invoke({
    audience: service,
    issuer,
    with: issuer.did(),
  })

  const identifyResult = await identify.execute(conn)
  if (identifyResult?.error || !identifyResult) {
    return t.fail()
  }
  // @ts-ignore
  const accounts = new Accounts(await mf.getKVNamespace('ACCOUNTS'))
  const did = await accounts.get(issuer.did())
  t.is(did?.account, identifyResult)
})
