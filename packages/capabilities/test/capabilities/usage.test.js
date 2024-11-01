import assert from 'assert'
import { access, Schema } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
import * as Usage from '../../src/usage.js'
import * as Capability from '../../src/top.js'
import {
  alice,
  service as w3,
  mallory as account,
  bob,
  gateway,
  readmeCID,
  mallory,
} from '../helpers/fixtures.js'
import { validateAuthorization } from '../helpers/utils.js'

const top = async () =>
  Capability.top.delegate({
    issuer: account,
    audience: alice,
    with: account.did(),
  })

const usage = async () =>
  Usage.usage.delegate({
    issuer: account,
    audience: alice,
    with: account.did(),
    proofs: [await top()],
  })

describe('usage capabilities', function () {
  it('usage/report can be derived from *', async () => {
    const period = { from: 0, to: 1 }
    const report = Usage.report.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      nb: { period },
      proofs: [await top()],
    })

    const result = await access(await report.delegate(), {
      capability: Usage.report,
      principal: Verifier,
      authority: w3,
      validateAuthorization,
    })

    if (result.error) {
      assert.fail(result.error.message)
    }

    assert.deepEqual(result.ok.audience.did(), w3.did())
    assert.equal(result.ok.capability.can, 'usage/report')
    assert.deepEqual(result.ok.capability.nb, { period })
  })

  it('usage/report can be derived from usage/*', async () => {
    const period = { from: 2, to: 3 }
    const report = Usage.report.invoke({
      issuer: alice,
      audience: w3,
      with: account.did(),
      nb: { period },
      proofs: [await usage()],
    })

    const result = await access(await report.delegate(), {
      capability: Usage.report,
      principal: Verifier,
      authority: w3,
      validateAuthorization,
    })

    if (result.error) {
      assert.fail(result.error.message)
    }

    assert.deepEqual(result.ok.audience.did(), w3.did())
    assert.equal(result.ok.capability.can, 'usage/report')
    assert.deepEqual(result.ok.capability.nb, { period })
  })

  it('usage/report can be derived from usage/* derived from *', async () => {
    const period = { from: 3, to: 4 }
    const usage = await Usage.report.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await top()],
    })

    const report = Usage.report.invoke({
      issuer: bob,
      audience: w3,
      with: account.did(),
      nb: { period },
      proofs: [usage],
    })

    const result = await access(await report.delegate(), {
      capability: Usage.report,
      principal: Verifier,
      authority: w3,
      validateAuthorization,
    })

    if (result.error) {
      assert.fail(result.error.message)
    }

    assert.deepEqual(result.ok.audience.did(), w3.did())
    assert.equal(result.ok.capability.can, 'usage/report')
    assert.deepEqual(result.ok.capability.nb, { period })
  })

  it('usage/report sholud fail when escalating period constraint', async () => {
    const period = { from: 5, to: 6 }
    const delegation = await Usage.report.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      nb: { period },
      proofs: [await top()],
    })

    {
      const report = Usage.report.invoke({
        issuer: bob,
        audience: w3,
        with: account.did(),
        nb: { period: { from: period.from + 1, to: period.to } },
        proofs: [delegation],
      })

      const result = await access(await report.delegate(), {
        capability: Usage.report,
        principal: Verifier,
        authority: w3,
        validateAuthorization,
      })

      assert.ok(result.error)
      assert(
        result.error.message.includes(
          `${period.from + 1} violates imposed period.from constraint ${
            period.from
          }`
        )
      )
    }

    {
      const report = Usage.report.invoke({
        issuer: bob,
        audience: w3,
        with: account.did(),
        nb: { period: { from: period.from, to: period.to + 1 } },
        proofs: [delegation],
      })

      const result = await access(await report.delegate(), {
        capability: Usage.report,
        principal: Verifier,
        authority: w3,
        validateAuthorization,
      })

      assert.ok(result.error)
      assert(
        result.error.message.includes(
          `${period.to + 1} violates imposed period.to constraint ${period.to}`
        )
      )
    }
  })

  it('usage/report period from must be an int', async () => {
    const period = { from: 5.5, to: 6 }
    const proofs = [await top()]
    assert.throws(() => {
      Usage.report.invoke({
        issuer: alice,
        audience: w3,
        with: account.did(),
        nb: { period },
        proofs,
      })
    }, /Expected value of type integer instead got 5\.5/)
  })

  it('usage/report period to must be an int', async () => {
    const period = { from: 5, to: 6.6 }
    const proofs = [await top()]
    assert.throws(() => {
      Usage.report.invoke({
        issuer: alice,
        audience: w3,
        with: account.did(),
        nb: { period },
        proofs,
      })
    }, /Expected value of type integer instead got 6\.6/)
  })

  it('should delegate and invoke usage/record', async () => {
    const data = {
      space: mallory.did(),
      resource: readmeCID,
      bytes: 100,
      servedAt: 1714204800,
    }

    // W3 delegates ability to record usage to Gateway
    const usageRecordDelegationProof = await Usage.record.delegate({
      issuer: w3,
      audience: gateway,
      with: w3.did(),
      expiration: Infinity,
    })

    // Gateway invokes usage/record and indicates the w3 as the audience
    const recordInvocation = Usage.record.invoke({
      issuer: gateway,
      audience: w3,
      with: gateway.did(),
      nb: { ...data },
      proofs: [usageRecordDelegationProof],
    })

    // W3 validates the delegation from Gateway to itself
    const result = await access(await recordInvocation.delegate(), {
      capability: Usage.record,
      principal: Verifier,
      authority: w3,
      validateAuthorization,
      resolveDIDKey: () => Schema.ok(gateway.toDIDKey()),
    })

    if (result.error) {
      assert.fail(result.error.message)
    }

    assert.deepEqual(result.ok.audience.did(), w3.did())
    assert.equal(result.ok.capability.can, 'usage/record')
    assert.deepEqual(result.ok.capability.nb, { ...data })
  })
})
