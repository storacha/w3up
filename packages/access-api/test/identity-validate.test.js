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

  const jwt =
    /** @type UCAN.JWT<[import('@web3-storage/access/types').IdentityRegister]>} */ (
      out.delegation.replace('http://localhost:8787/validate?ucan=', '')
    )
  const ucan = UCAN.parse(jwt)
  t.is(ucan.audience.did(), issuer.did())
  t.is(ucan.issuer.did(), service.did())
  t.deepEqual(ucan.capabilities, [
    {
      can: 'identity/register',
      with: 'mailto:hugo@dag.house',
      nb: {
        as: issuer.did(),
      },
    },
  ])
})
