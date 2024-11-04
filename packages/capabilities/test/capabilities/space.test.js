import assert from 'assert'
import { access, DIDResolutionError, Schema } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
import {
  alice,
  service as w3,
  gateway,
  readmeCID,
  mallory as agent,
  space,
} from '../helpers/fixtures.js'
import { validateAuthorization } from '../helpers/utils.js'
import { Access, Space } from '../../src/index.js'

// const top = async () =>
//   Space.top.delegate({
//     issuer: account,
//     audience: alice,
//     with: account.did(),
//   })

describe.skip('space capabilities', function () {
  const resolveDIDKey = (
    /* @ts-ignore */
    k
  ) => {
    const didKey = [w3, gateway, alice]
      .find((signer) => signer.did() === k)
      ?.toDIDKey()
    if (didKey) {
      return Schema.ok(didKey)
    } else {
      return { error: new DIDResolutionError(k) }
    }
  }

  it('should delegate and invoke space/content/serve/egress/record', async () => {
    const data = {
      space: space.did(),
      resource: readmeCID,
      bytes: 100,
      servedAt: 1714204800,
    }
    const auth = Access.authorize.invoke({
      issuer: agent,
      audience: alice,
      with: agent.did(),
      nb: {
        iss: 'did:mailto:web3.storage:test',
        att: [{ can: '*' }],
      },
    })

    const resultA = await access(await auth.delegate(), {
      capability: Access.authorize,
      principal: Verifier,
      authority: alice,
      validateAuthorization,
    })
    assert.ok(resultA.ok)

    // Agent delegates to Alice the ability to record egress
    const aliceEgressRecordProof = await Space.recordEgress.delegate({
      issuer: agent,
      audience: alice,
      with: data.space,
      expiration: Date.now() + 10e9,
    })
    assert.ok(aliceEgressRecordProof)

    // Alice delegates to the Gateway the ability to record egress
    const gatewayEgressRecordProof = await Space.recordEgress.delegate({
      issuer: alice,
      audience: gateway,
      with: data.space,
      expiration: Date.now() + 10e9,
    })

    // Gateway invokes egress/record with the proof
    const recordInvocation = Space.recordEgress.invoke({
      issuer: gateway,
      audience: w3,
      with: data.space,
      nb: { ...data },
      proofs: [gatewayEgressRecordProof],
    })

    // W3 validates the delegation from Alice to Gateway
    const delegation = await recordInvocation.delegate()
    const result = await access(delegation, {
      capability: Space.recordEgress,
      principal: Verifier,
      authority: w3,
      validateAuthorization,
      resolveDIDKey,
    })

    if (result.error) {
      assert.fail(result.error.message)
    }

    assert.deepEqual(result.ok.audience.did(), gateway.did())
    assert.equal(result.ok.capability.can, 'space/content/serve/egress/record')
    assert.deepEqual(result.ok.capability.nb, { ...data })
  })

  // it('usage/report can be derived from usage/*', async () => {
  //   const period = { from: 2, to: 3 }
  //   const report = Usage.report.invoke({
  //     issuer: alice,
  //     audience: w3,
  //     with: account.did(),
  //     nb: { period },
  //     proofs: [await Usage.usage()],
  //   })

  //   const result = await access(await report.delegate(), {
  //     capability: Usage.report,
  //     principal: Verifier,
  //     authority: w3,
  //     validateAuthorization,
  //   })

  //   if (result.error) {
  //     assert.fail(result.error.message)
  //   }

  //   assert.deepEqual(result.ok.audience.did(), w3.did())
  //   assert.equal(result.ok.capability.can, 'usage/report')
  //   assert.deepEqual(result.ok.capability.nb, { period })
  // })
})
