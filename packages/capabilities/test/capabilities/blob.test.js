import assert from 'assert'
import { access } from '@ucanto/validator'
import { ed25519, Verifier } from '@ucanto/principal'
import * as Blob from '../../src/blob.js'
import * as Capability from '../../src/top.js'
import {
  alice,
  service as storageNode,
  mallory as account,
  bob,
} from '../helpers/fixtures.js'
import { createCar, createCborCid, validateAuthorization } from '../helpers/utils.js'

const top = () =>
  Capability.top.delegate({
    issuer: account,
    audience: alice,
    with: account.did(),
  })

const blob = async () =>
  Blob.blob.delegate({
    issuer: account,
    audience: alice,
    with: account.did(),
    proofs: [await top()],
  })

describe('blob capabilities', function () {
  it('blob/allocate can be derived from *', async () => {
    const space = await ed25519.generate()
    const car = await createCar('test')

    const allocate = Blob.allocate.invoke({
      issuer: alice,
      audience: storageNode,
      with: account.did(),
      nb: {
        blob: {
          digest: car.cid.multihash.bytes,
          size: car.bytes.length
        },
        space: space.did(),
        cause: await createCborCid({ now: Date.now() })
      },
      proofs: [await top()],
    })

    const result = await access(await allocate.delegate(), {
      capability: Blob.allocate,
      principal: Verifier,
      authority: storageNode,
      validateAuthorization,
    })
    assert.ok(result.ok)
    assert.deepEqual(result.ok.audience.did(), storageNode.did())
    assert.equal(result.ok.capability.can, Blob.allocate.can)
  })

  it('blob/allocate can be derived from blob/*', async () => {
    const space = await ed25519.generate()
    const car = await createCar('test')

    const allocate = Blob.allocate.invoke({
      issuer: alice,
      audience: storageNode,
      with: account.did(),
      nb: {
        blob: {
          digest: car.cid.multihash.bytes,
          size: car.bytes.length
        },
        space: space.did(),
        cause: await createCborCid({ now: Date.now() })
      },
      proofs: [await blob()],
    })

    const result = await access(await allocate.delegate(), {
      capability: Blob.allocate,
      principal: Verifier,
      authority: storageNode,
      validateAuthorization,
    })
    assert.ok(result.ok)
    assert.deepEqual(result.ok.audience.did(), storageNode.did())
    assert.equal(result.ok.capability.can, Blob.allocate.can)
  })

  it('blob/allocate can be derived from blob/* derived from *', async () => {
    const space = await ed25519.generate()
    const car = await createCar('test')

    const blob = await Blob.blob.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await top()],
    })

    const allocate = Blob.allocate.invoke({
      issuer: bob,
      audience: storageNode,
      with: account.did(),
      nb: {
        blob: {
          digest: car.cid.multihash.bytes,
          size: car.bytes.length
        },
        space: space.did(),
        cause: await createCborCid({ now: Date.now() })
      },
      proofs: [blob],
    })

    const result = await access(await allocate.delegate(), {
      capability: Blob.allocate,
      principal: Verifier,
      authority: storageNode,
      validateAuthorization,
    })
    assert.ok(result.ok)
    assert.deepEqual(result.ok.audience.did(), storageNode.did())
    assert.equal(result.ok.capability.can, Blob.allocate.can)
  })

  it('blob/allocate should fail when escalating space constraint', async () => {
    const space0 = await ed25519.generate()
    const space1 = await ed25519.generate()
    const car = await createCar('test')

    const blob = await Blob.allocate.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      nb: {
        space: space0.did()
      },
      proofs: [await top()],
    })

    const allocate = Blob.allocate.invoke({
      issuer: bob,
      audience: storageNode,
      with: account.did(),
      nb: {
        blob: {
          digest: car.cid.multihash.bytes,
          size: car.bytes.length
        },
        space: space1.did(),
        cause: await createCborCid({ now: Date.now() })
      },
      proofs: [blob],
    })

    const result = await access(await allocate.delegate(), {
      capability: Blob.allocate,
      principal: Verifier,
      authority: storageNode,
      validateAuthorization,
    })
    assert.ok(result.error)
    assert(result.error.message.includes('violates imposed space constraint'))
  })

  it('blob/accept can be derived from *', async () => {
    const space = await ed25519.generate()
    const car = await createCar('test')

    const accept = Blob.accept.invoke({
      issuer: alice,
      audience: storageNode,
      with: account.did(),
      nb: {
        blob: {
          digest: car.cid.multihash.bytes,
          size: car.bytes.length
        },
        space: space.did(),
        _put: {
          'ucan/await': ['.out.ok', await createCborCid('receipt')]
        }
      },
      proofs: [await top()],
    })

    const result = await access(await accept.delegate(), {
      capability: Blob.accept,
      principal: Verifier,
      authority: storageNode,
      validateAuthorization,
    })
    assert.ok(result.ok)
    assert.deepEqual(result.ok.audience.did(), storageNode.did())
    assert.equal(result.ok.capability.can, Blob.accept.can)
  })

  it('blob/accept can be derived from blob/*', async () => {
    const space = await ed25519.generate()
    const car = await createCar('test')

    const accept = Blob.accept.invoke({
      issuer: alice,
      audience: storageNode,
      with: account.did(),
      nb: {
        blob: {
          digest: car.cid.multihash.bytes,
          size: car.bytes.length
        },
        space: space.did(),
        _put: {
          'ucan/await': ['.out.ok', await createCborCid('receipt')]
        }
      },
      proofs: [await blob()],
    })

    const result = await access(await accept.delegate(), {
      capability: Blob.accept,
      principal: Verifier,
      authority: storageNode,
      validateAuthorization,
    })
    assert.ok(result.ok)
    assert.deepEqual(result.ok.audience.did(), storageNode.did())
    assert.equal(result.ok.capability.can, Blob.accept.can)
  })

  it('blob/accept can be derived from blob/* derived from *', async () => {
    const space = await ed25519.generate()
    const car = await createCar('test')

    const blob = await Blob.blob.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      proofs: [await top()],
    })

    const accept = Blob.accept.invoke({
      issuer: bob,
      audience: storageNode,
      with: account.did(),
      nb: {
        blob: {
          digest: car.cid.multihash.bytes,
          size: car.bytes.length
        },
        space: space.did(),
        _put: {
          'ucan/await': ['.out.ok', await createCborCid('receipt')]
        }
      },
      proofs: [blob],
    })

    const result = await access(await accept.delegate(), {
      capability: Blob.accept,
      principal: Verifier,
      authority: storageNode,
      validateAuthorization,
    })
    assert.ok(result.ok)
    assert.deepEqual(result.ok.audience.did(), storageNode.did())
    assert.equal(result.ok.capability.can, Blob.accept.can)
  })

  it('blob/accept should fail when escalating space constraint', async () => {
    const space0 = await ed25519.generate()
    const space1 = await ed25519.generate()
    const car = await createCar('test')

    const blob = await Blob.accept.delegate({
      issuer: alice,
      audience: bob,
      with: account.did(),
      nb: {
        space: space0.did()
      },
      proofs: [await top()],
    })

    const accept = Blob.accept.invoke({
      issuer: bob,
      audience: storageNode,
      with: account.did(),
      nb: {
        blob: {
          digest: car.cid.multihash.bytes,
          size: car.bytes.length
        },
        space: space1.did(),
        _put: {
          'ucan/await': ['.out.ok', await createCborCid('receipt')]
        }
      },
      proofs: [blob],
    })

    const result = await access(await accept.delegate(), {
      capability: Blob.accept,
      principal: Verifier,
      authority: storageNode,
      validateAuthorization,
    })
    assert.ok(result.error)
    assert(result.error.message.includes('violates imposed space constraint'))
  })
})
