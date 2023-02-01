import assert from 'assert'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal/ed25519'
import * as Consumer from '../../src/consumer.js'
import { alice, bob, service, mallory } from '../helpers/fixtures.js'
import { parseLink } from '@ucanto/core'
import { createCborCid } from '../helpers/utils.js'

describe('consumer capabilities', function () {
  describe('consumer/add', function () {
    it('should not self issue', async function () {
      const space = bob
      const provider = mallory.withDID(
        'did:web:ucan.web3.storage:providers:free'
      )
      const invocation = Consumer.add.invoke({
        issuer: alice,
        audience: service,
        with: provider.did(),
        nb: {
          request: parseLink('bafkqaaa'),
          consumer: space.did(),
        },
      })

      const result = await access(await invocation.delegate(), {
        capability: Consumer.add,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.ok(
          result.message.includes(`Capability can not be (self) issued`)
        )
      } else {
        assert.fail('should return error')
      }
    })

    it('should fail different nb.request', async function () {
      const space = bob
      const provider = alice
      const consume = Consumer.add.invoke({
        issuer: mallory,
        audience: service,
        with: provider.did(),
        nb: {
          request: parseLink('bafkqaaa'),
          consumer: space.did(),
        },
        proofs: [
          await Consumer.add.delegate({
            issuer: provider,
            audience: mallory,
            with: provider.did(),
            nb: {
              request: await createCborCid('root'),
              consumer: space.did(),
            },
          }),
        ],
      })

      const result = await access(await consume.delegate(), {
        capability: Consumer.add,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.ok(
          result.message.includes(
            `Constrain violation: ${parseLink(
              'bafkqaaa'
            )} violates imposed request constraint ${await createCborCid(
              'root'
            )}`
          )
        )
      } else {
        assert.fail('should return error')
      }
    })

    it('should fail different nb.consumer', async function () {
      const space = bob
      const provider = alice
      const consume = Consumer.add.invoke({
        issuer: mallory,
        audience: service,
        with: provider.did(),
        nb: {
          request: parseLink('bafkqaaa'),
          consumer: space.did(),
        },
        proofs: [
          await Consumer.add.delegate({
            issuer: provider,
            audience: mallory,
            with: provider.did(),
            nb: {
              request: parseLink('bafkqaaa'),
              consumer: mallory.did(),
            },
          }),
        ],
      })

      const result = await access(await consume.delegate(), {
        capability: Consumer.add,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.ok(
          result.message.includes(
            `${space.did()} violates imposed consumer constraint ${mallory.did()}`
          )
        )
      } else {
        assert.fail('should return error')
      }
    })

    it('should invoke with good proof', async function () {
      const space = bob
      const provider = alice
      const consume = Consumer.add.invoke({
        issuer: mallory,
        audience: service,
        with: provider.did(),
        nb: {
          request: parseLink('bafkqaaa'),
          consumer: space.did(),
        },
        proofs: [
          await Consumer.add.delegate({
            issuer: provider,
            audience: mallory,
            with: provider.did(),
            nb: {
              request: parseLink('bafkqaaa'),
              consumer: space.did(),
            },
          }),
        ],
      })

      const result = await access(await consume.delegate(), {
        capability: Consumer.add,
        principal: Verifier,
        authority: service,
      })
      if (result.error) {
        assert.fail('should return error')
      } else {
        assert.deepEqual(result.audience.did(), service.did())
        assert.equal(result.capability.can, 'consumer/add')
        assert.deepEqual(result.capability.nb, {
          request: parseLink('bafkqaaa'),
          consumer: space.did(),
        })
      }
    })
  })
})
