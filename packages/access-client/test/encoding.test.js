import assert from 'assert'
import { alice, bob } from './helpers/fixtures.js'
import * as Delegation from '@ucanto/core/delegation'
import * as UCAN from '@ipld/dag-ucan'
import {
  bytesToDelegations,
  delegationsToBytes,
  delegationsToString,
  stringToDelegations,
} from '../src/encoding.js'

describe('Encoding', function () {
  it('delegationsToBytes should fail with empty array', async function () {
    assert.throws(
      () => {
        delegationsToBytes([])
      },
      {
        name: 'Error',
        message: 'Delegations required to be an non empty array.',
      }
    )

    assert.throws(
      () => {
        // @ts-ignore
        delegationsToBytes('ss')
      },
      {
        name: 'Error',
        message: 'Delegations required to be an non empty array.',
      }
    )

    assert.throws(
      () => {
        // @ts-ignore
        delegationsToString('ss')
      },
      {
        name: 'Error',
        message: 'Delegations required to be an non empty array.',
      }
    )

    assert.throws(
      () => {
        // @ts-ignore
        delegationsToString([])
      },
      {
        name: 'Error',
        message: 'Delegations required to be an non empty array.',
      }
    )
  })

  it('bytesToDelegations should fail with string', async function () {
    assert.throws(
      () => {
        // @ts-ignore
        bytesToDelegations('ss')
      },
      {
        name: 'TypeError',
        message: 'Input should be a non-empty Uint8Array.',
      }
    )
  })

  it('stringToDelegations should fail with empty string', async function () {
    assert.throws(
      () => {
        stringToDelegations('')
      },
      {
        name: 'TypeError',
        message: 'Input should be a non-empty Uint8Array.',
      }
    )
  })

  it('encode/decode ucan -> delegation -> bytes -> delegation', async function () {
    const data = await UCAN.issue({
      issuer: alice,
      audience: bob,
      capabilities: [
        {
          can: 'store/add',
          with: alice.did(),
        },
      ],
    })
    const { cid, bytes } = await UCAN.write(data)
    const delegation = Delegation.create({
      root: {
        cid,
        bytes,
      },
    })

    assert.deepEqual(delegation.capabilities, [
      {
        can: 'store/add',
        with: alice.did(),
      },
    ])

    const encoded = delegationsToBytes([delegation])
    const delegations = bytesToDelegations(encoded)

    assert.ok(delegations.length === 1)
    assert.ok(delegation.cid.equals(delegations[0].cid))
  })

  it('encode/decode multiple delegations -> bytes -> delegations', async function () {
    const delegation1 = await Delegation.delegate({
      audience: alice,
      issuer: bob,
      capabilities: [
        {
          can: '*',
          with: 'mailto:email.com',
        },
      ],
    })

    const delegation2 = await Delegation.delegate({
      audience: alice,
      issuer: bob,
      capabilities: [
        {
          can: 'send/email',
          with: 'mailto:email.com',
        },
      ],
    })

    const encoded = delegationsToBytes([delegation1, delegation2])
    const delegations = bytesToDelegations(encoded)

    assert.ok(delegations.length === 2)
    assert.ok(delegations[0].cid.equals(delegation1.cid))
    assert.ok(delegations[1].cid.equals(delegation2.cid))
    assert.deepEqual(delegations[0].capabilities, [
      {
        can: '*',
        with: 'mailto:email.com',
      },
    ])
  })

  it('encode/decode nested delegations -> bytes -> delegations', async function () {
    const delegation = await Delegation.delegate({
      audience: alice,
      issuer: bob,
      capabilities: [
        {
          can: '*',
          with: 'mailto:email.com',
        },
      ],
      proofs: [
        await Delegation.delegate({
          audience: alice,
          issuer: bob,
          capabilities: [
            {
              can: 'send/email',
              with: 'mailto:email.com',
            },
          ],
        }),
      ],
    })

    const encoded = delegationsToBytes([delegation])
    const delegations = bytesToDelegations(encoded)

    assert.ok(delegations.length === 1)
    assert.ok(delegations[0].cid.equals(delegation.cid))
    assert.deepEqual(delegations[0].capabilities, [
      {
        can: '*',
        with: 'mailto:email.com',
      },
    ])

    // @ts-ignore - proofs[0] could be a link but here we know its a ucan
    assert.deepEqual(delegations[0].proofs[0].capabilities, [
      {
        can: 'send/email',
        with: 'mailto:email.com',
      },
    ])
  })

  it('encode/decode does not dedupe roots but compresses blocks', async function () {
    const delegation1 = await Delegation.delegate({
      audience: alice,
      issuer: bob,
      capabilities: [
        {
          can: '*',
          with: 'mailto:email.com',
        },
      ],
    })

    const encoded = delegationsToBytes([delegation1, delegation1])
    // delegation1 size is 307 bytes
    assert.ok(encoded.length === 347)
    const delegations = bytesToDelegations(encoded)

    assert.ok(delegations.length === 2)
  })
})
