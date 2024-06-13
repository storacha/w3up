import * as Test from './test.js'
import * as CAR from '@ucanto/transport/car'
import * as Link from 'multiformats/link'
import { base64 } from 'multiformats/bases/base64'
import { identity } from 'multiformats/hashes/identity'
import { sha256 } from 'multiformats/hashes/sha2'
import { Signer } from '../src/principal/ed25519.js'
import { delegate } from '../src/delegation.js'
import { parse } from '../src/proof.js'
import * as Result from '../src/result.js'

/**
 * @type {Test.Suite}
 */
export const testProof = {
  'should parse a base64 encoded CIDv1 "proof"': async (assert) => {
    const alice = await Signer.generate()
    const bob = await Signer.generate()
    const delegation = await delegate({
      issuer: alice,
      audience: bob,
      capabilities: [{ can: 'test/thing', with: alice.did() }]
    })

    const bytes = Result.unwrap(await delegation.archive())
    const str = Link.create(CAR.codec.code, identity.digest(bytes)).toString(base64)

    const proof = await parse(str)
    assert.equal(proof.issuer.did(), delegation.issuer.did())
    assert.equal(proof.audience.did(), delegation.audience.did())
    assert.equal(proof.capabilities[0].can, delegation.capabilities[0].can)
    assert.equal(proof.capabilities[0].with, delegation.capabilities[0].with)
  },

  'should fail to parse if CID is not CAR codec': async (assert) => {
    const alice = await Signer.generate()
    const bob = await Signer.generate()
    const delegation = await delegate({
      issuer: alice,
      audience: bob,
      capabilities: [{ can: 'test/thing', with: alice.did() }]
    })

    const bytes = Result.unwrap(await delegation.archive())
    const str = Link.create(12345, identity.digest(bytes)).toString(base64)

    await assert.rejects(parse(str))
  },

  'should fail to parse if multihash is not identity hash': async (assert) => {
    const alice = await Signer.generate()
    const bob = await Signer.generate()
    const delegation = await delegate({
      issuer: alice,
      audience: bob,
      capabilities: [{ can: 'test/thing', with: alice.did() }]
    })

    const bytes = Result.unwrap(await delegation.archive())
    const str = Link.create(CAR.codec.code, await sha256.digest(bytes)).toString(base64)

    await assert.rejects(parse(str))
  },

  'should parse a base64 encoded CIDv1 "proof" as plain CAR (legacy)': async (assert) => {
    const alice = await Signer.generate()
    const bob = await Signer.generate()
    const delegation = await delegate({
      issuer: alice,
      audience: bob,
      capabilities: [{ can: 'test/thing', with: alice.did() }]
    })

    const blocks = new Map()
    for (const block of delegation.export()) {
      blocks.set(block.cid.toString(), block)
    }

    const bytes = CAR.codec.encode({ blocks })
    const str = Link.create(CAR.codec.code, identity.digest(bytes)).toString(base64)

    const proof = await parse(str)
    assert.equal(proof.issuer.did(), delegation.issuer.did())
    assert.equal(proof.audience.did(), delegation.audience.did())
    assert.equal(proof.capabilities[0].can, delegation.capabilities[0].can)
    assert.equal(proof.capabilities[0].with, delegation.capabilities[0].with)
  },

  'should parse a base64 encoded "proof" as plain CAR (legacy)': async (assert) => {
    const alice = await Signer.generate()
    const bob = await Signer.generate()
    const delegation = await delegate({
      issuer: alice,
      audience: bob,
      capabilities: [{ can: 'test/thing', with: alice.did() }]
    })

    const blocks = new Map()
    for (const block of delegation.export()) {
      blocks.set(block.cid.toString(), block)
    }

    const bytes = CAR.codec.encode({ blocks })
    const str = base64.baseEncode(bytes)

    const proof = await parse(str)
    assert.equal(proof.issuer.did(), delegation.issuer.did())
    assert.equal(proof.audience.did(), delegation.audience.did())
    assert.equal(proof.capabilities[0].can, delegation.capabilities[0].can)
    assert.equal(proof.capabilities[0].with, delegation.capabilities[0].with)
  }
}

Test.test({ Proof: testProof })
