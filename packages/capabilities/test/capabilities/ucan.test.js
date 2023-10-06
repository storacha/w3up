import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import * as UCAN from '../../src/ucan.js'
import { alice, bob, service, mallory } from '../helpers/fixtures.js'
import { delegate, parseLink, API } from '@ucanto/core'
import { validateAuthorization } from '../helpers/utils.js'

/** @type {API.UCANLink} */
const delegation = parseLink(
  'bafyreieicjmit6d6ubkd2mw7snpx33ijquxcjetp4fvbjr2dkdonvr5dpe'
)

describe('ucan/* capabilities', () => {
  describe('ucan/revoke', () => {
    it('owner can issue revocation', async () => {
      const revoke = UCAN.revoke.invoke({
        issuer: alice,
        audience: service,
        with: alice.did(),
        nb: {
          delegation,
        },
      })

      const result = await access(await revoke.delegate(), {
        capability: UCAN.revoke,
        principal: Verifier,
        authority: service,
        validateAuthorization,
      })

      assert.ok(result.ok)
    })

    it('delegate can issue revocation', async () => {
      const revoke = UCAN.revoke.invoke({
        issuer: bob,
        audience: service,
        with: alice.did(),
        nb: {
          delegation,
        },
        proofs: [
          await UCAN.revoke.delegate({
            issuer: alice,
            audience: bob,
            with: alice.did(),
          }),
        ],
      })

      const result = await access(await revoke.delegate(), {
        capability: UCAN.revoke,
        principal: Verifier,
        authority: service,
        validateAuthorization,
      })

      assert.ok(result.ok)
    })

    it('non delegate can not issue revocation', async () => {
      const proof = await delegate({
        issuer: alice,
        audience: bob,
        capabilities: [
          {
            with: alice.did(),
            can: 'console/log',
          },
        ],
      })

      const revoke = UCAN.revoke.invoke({
        issuer: mallory,
        audience: service,
        with: alice.did(),
        nb: {
          delegation: proof.cid,
        },
        proofs: [
          await UCAN.revoke.delegate({
            issuer: alice,
            audience: bob,
            with: alice.did(),
          }),
        ],
      })

      const result = await access(await revoke.delegate(), {
        capability: UCAN.revoke,
        principal: Verifier,
        authority: service,
        validateAuthorization,
      })

      assert.ok(result.error)
    })

    it('can be derived from ucan/*', async () => {
      const revoke = UCAN.revoke.invoke({
        issuer: bob,
        audience: service,
        with: alice.did(),
        nb: {
          delegation,
        },
        proofs: [
          await UCAN.ucan.delegate({
            issuer: alice,
            with: alice.did(),
            audience: bob,
          }),
        ],
      })

      const result = await access(await revoke.delegate(), {
        capability: UCAN.revoke,
        principal: Verifier,
        authority: service,
        validateAuthorization,
      })

      assert.ok(result.ok)
    })

    it('with field must match', async () => {
      const revoke = UCAN.revoke.invoke({
        issuer: bob,
        audience: service,
        with: mallory.did(),
        nb: {
          delegation,
        },
        proofs: [
          await UCAN.ucan.delegate({
            issuer: alice,
            with: alice.did(),
            audience: bob,
          }),
        ],
      })

      const result = await access(await revoke.delegate(), {
        capability: UCAN.revoke,
        principal: Verifier,
        authority: service,
        validateAuthorization,
      })

      assert.ok(result.error)
    })

    it('nb.delegation field must match', async () => {
      const revoke = UCAN.revoke.invoke({
        issuer: bob,
        audience: service,
        with: alice.did(),
        nb: {
          delegation,
        },
        proofs: [
          await UCAN.revoke.delegate({
            issuer: alice,
            with: alice.did(),
            audience: bob,
            nb: {
              delegation: parseLink('bafkqaaa'),
            },
          }),
        ],
      })

      const result = await access(await revoke.delegate(), {
        capability: UCAN.revoke,
        principal: Verifier,
        authority: service,
        validateAuthorization,
      })

      assert.ok(result.error)
    })
  })
})
