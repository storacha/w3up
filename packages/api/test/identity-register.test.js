import * as ucans from 'ucans'
import { bindings, mf, test } from './helpers/setup.js'
import { Accounts } from '../src/kvs/accounts.js'

const serviceKp = ucans.EdKeypair.fromSecretKey(bindings._PRIVATE_KEY)

test.before((t) => {
  t.context = { mf }
})

test('should route correctly to identity/register', async (t) => {
  const { mf } = t.context
  const kp = await ucans.EdKeypair.create()

  const validateUcan = await ucans.build({
    issuer: kp,
    audience: serviceKp.did(),
    lifetimeInSeconds: 1000,
    capabilities: [
      {
        with: { scheme: 'mailto', hierPart: 'hugo@dag.house' },
        can: { namespace: 'identity', segments: ['validate'] },
      },
    ],
  })

  const res = await mf.dispatchFetch('http://localhost:8787', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ucans.encode(validateUcan)}`,
    },
  })
  const rsp = await res.json()
  const jwt = rsp.value
  const registerUCAN = await ucans.build({
    issuer: kp,
    audience: serviceKp.did(),
    lifetimeInSeconds: 1000,
    capabilities: [
      {
        with: { scheme: 'did:email', hierPart: 'hugo@dag.house' },
        can: { namespace: 'identity', segments: ['register'] },
      },
    ],
    proofs: [jwt],
  })

  const register = await mf.dispatchFetch('http://localhost:8787', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ucans.encode(registerUCAN)}`,
    },
  })
  t.true(register.ok)

  // @ts-ignore
  const accounts = new Accounts(await mf.getKVNamespace('ACCOUNTS'))
  const email = await accounts.get('did:email:hugo@dag.house')
  t.is(email?.proof, ucans.encode(registerUCAN))

  const did = await accounts.get(kp.did())
  t.is(did?.proof, ucans.encode(registerUCAN))
})
