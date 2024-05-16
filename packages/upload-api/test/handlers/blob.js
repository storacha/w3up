import * as API from '../../src/types.js'
import { sha256 } from 'multiformats/hashes/sha2'
import { ed25519 } from '@ucanto/principal'
import { Receipt } from '@ucanto/core'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'

import { createServer, connect } from '../../src/lib.js'
import { alice, registerSpace } from '../util.js'
import { BlobSizeOutsideOfSupportedRangeName } from '../../src/blob/lib.js'
import { createConcludeInvocation } from '../../src/ucan/conclude.js'
import { parseBlobAddReceiptNext } from '../helpers/blob.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'blob/add schedules allocation and returns effects for allocate (and its receipt), put and accept':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const digest = multihash.bytes
      const size = data.byteLength

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // invoke `blob/add`
      const invocation = BlobCapabilities.add.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            digest,
            size,
          },
        },
        proofs: [proof],
      })
      const blobAdd = await invocation.execute(connection)
      if (!blobAdd.out.ok) {
        throw new Error('invocation failed', { cause: blobAdd })
      }

      const next = parseBlobAddReceiptNext(blobAdd)

      // Validate receipt structure
      assert.ok(blobAdd.out.ok.site)
      assert.equal(blobAdd.out.ok.site['ucan/await'][0], '.out.ok.site')
      assert.deepEqual(
        blobAdd.out.ok.site['ucan/await'][1],
        next.accept.task.cid
      )
      assert.equal(blobAdd.fx.fork.length, 4)

      // validate receipt next
      assert.ok(next.allocate.task)
      assert.ok(next.put.task)
      assert.ok(next.accept.task)
      assert.ok(next.allocate.receipt)
      assert.ok(!next.put.receipt)
      assert.ok(!next.accept.receipt)

      // validate facts exist for `http/put`
      assert.ok(next.put.task.facts.length)
      assert.ok(next.put.task.facts[0]['keys'])

      // Validate `http/put` invocation was stored
      const httpPutGetTask = await context.agentStore.invocations.get(
        next.put.task.cid
      )
      assert.ok(httpPutGetTask.ok)

      // validate that scheduled allocate task executed and has its receipt content
      const receipt = next.allocate.receipt
      assert.ok(receipt.out)
      assert.ok(receipt.out.ok)
      assert.equal(receipt.out.ok?.size, size)
      assert.ok(receipt.out.ok?.address)
    },
  'blob/add schedules allocation only on first blob/add': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)

    // prepare data
    const data = new Uint8Array([11, 22, 34, 44, 55])
    const multihash = await sha256.digest(data)
    const digest = multihash.bytes
    const size = data.byteLength

    // create service connection
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // create `blob/add` invocation
    const invocation = BlobCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: {
        blob: {
          digest,
          size,
        },
      },
      proofs: [proof],
    })
    // Invoke `blob/add` for the first time
    const firstBlobAdd = await invocation.execute(connection)
    if (!firstBlobAdd.out.ok) {
      throw new Error('invocation failed', { cause: firstBlobAdd })
    }

    // parse first receipt next
    const firstNext = parseBlobAddReceiptNext(firstBlobAdd)
    assert.ok(firstNext.allocate.task)
    assert.ok(firstNext.put.task)
    assert.ok(firstNext.accept.task)
    assert.ok(firstNext.allocate.receipt)
    assert.ok(!firstNext.put.receipt)
    assert.ok(!firstNext.accept.receipt)

    // Invoke `blob/add` for the second time (without storing the blob)
    const secondBlobAdd = await invocation.execute(connection)
    if (!secondBlobAdd.out.ok) {
      throw new Error('invocation failed', { cause: secondBlobAdd })
    }

    // parse second receipt next
    const secondNext = parseBlobAddReceiptNext(secondBlobAdd)
    assert.ok(secondNext.allocate.task)
    assert.ok(secondNext.put.task)
    assert.ok(secondNext.accept.task)
    assert.ok(secondNext.allocate.receipt)
    assert.ok(!secondNext.put.receipt)
    assert.ok(!secondNext.accept.receipt)
    // allocate receipt is from same invocation CID
    assert.ok(
      firstNext.allocate.task.link().equals(secondNext.allocate.task.link())
    )
  },
  'blob/add schedules allocation and returns effects for allocate, accept and put together with their receipts (when stored)':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const digest = multihash.bytes
      const size = data.byteLength

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      const task = {
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            digest,
            size,
          },
        },
        proofs: [proof],
      }

      // create `blob/add` invocation
      const invocation = BlobCapabilities.add.invoke(task)
      // Invoke `blob/add` for the first time
      const firstBlobAdd = await invocation.execute(connection)
      if (!firstBlobAdd.out.ok) {
        throw new Error('invocation failed', { cause: firstBlobAdd })
      }

      // parse first receipt next
      const firstNext = parseBlobAddReceiptNext(firstBlobAdd)

      // got allocation task and receipt
      assert.ok(firstNext.allocate.task, 'allocation task was dispatched')
      assert.ok(
        firstNext.allocate.receipt.out.ok?.size ?? 0 > 0,
        'allocated memory is greater than 0 bytes'
      )
      assert.ok(
        firstNext.allocate.receipt.out.ok?.address,
        'allocated memory has an address'
      )

      assert.ok(firstNext.put.task, 'put task was dispatched')
      assert.ok(!firstNext.put.receipt, 'put receipt was not received')

      assert.ok(firstNext.accept.task, 'accept task was dispatched')
      assert.ok(!firstNext.accept.receipt, 'accept receipt was not received')

      /** @type {import('@web3-storage/capabilities/types').BlobAddress} */
      // @ts-expect-error receipt type is unknown
      const address = firstNext.allocate.receipt.out.ok.address

      // Invoke `blob/add` for the second time
      const secondBlobAdd = await BlobCapabilities.add
        .invoke({ ...task, nonce: 'second' })
        .execute(connection)
      if (!secondBlobAdd.out.ok) {
        throw new Error('invocation failed', { cause: secondBlobAdd })
      }

      assert.ok(
        firstBlobAdd.link().toString() !== secondBlobAdd.link().toString(),
        'second invocation has different link'
      )

      // parse second receipt next
      const secondNext = parseBlobAddReceiptNext(secondBlobAdd)
      assert.ok(secondNext.allocate.task, 'allocate task received')
      assert.equal(
        secondNext.allocate.receipt.out.ok?.size,
        0,
        'no more bytes were allocated'
      )
      assert.ok(
        secondNext.allocate.receipt.out.ok?.address,
        'allocated memory was given an address'
      )

      assert.ok(secondNext.put.task, 'put task was dispatched')
      assert.ok(!secondNext.put.receipt, 'put receipt was not received')

      assert.ok(secondNext.accept.task, 'accept task was dispatched')
      assert.ok(!secondNext.accept.receipt, 'accept receipt was not received')

      // Store the blob to the address
      const goodPut = await fetch(address.url, {
        method: 'PUT',
        mode: 'cors',
        body: data,
        headers: address.headers,
      })

      assert.equal(goodPut.status, 200, await goodPut.text())

      // Invoke `conclude` with `http/put` receipt
      const keys = secondNext.put.task.facts[0]['keys']
      // @ts-expect-error Argument of type 'unknown' is not assignable to parameter of type 'SignerArchive<`did:${string}:${string}`, SigAlg>'
      const blobProvider = ed25519.from(keys)

      const httpPutReceipt = await Receipt.issue({
        issuer: blobProvider,
        ran: secondNext.put.task.link(),
        result: {
          ok: {},
        },
      })
      const httpPutConcludeInvocation = createConcludeInvocation(
        alice,
        context.id,
        httpPutReceipt
      )
      const ucanConclude = await httpPutConcludeInvocation.execute(connection)
      if (!ucanConclude.out.ok) {
        throw new Error('invocation failed', { cause: ucanConclude.out })
      }

      // Invoke `blob/add` for the third time (after invoking conclude)
      const thirdBlobAdd = await BlobCapabilities.add
        .invoke({ ...task, nonce: 'third' })
        .execute(connection)
      if (!thirdBlobAdd.out.ok) {
        throw new Error('invocation failed', { cause: thirdBlobAdd })
      }

      assert.ok(
        thirdBlobAdd.link().toString() !== firstBlobAdd.link().toString()
      )
      assert.ok(
        thirdBlobAdd.link().toString() !== secondBlobAdd.link().toString()
      )

      // parse third receipt next
      const thirdNext = parseBlobAddReceiptNext(thirdBlobAdd)
      assert.ok(thirdNext.allocate.task, 'allocate task received')
      assert.equal(
        thirdNext.allocate.receipt.out.ok?.size,
        0,
        'no more bytes were allocated'
      )
      assert.ok(
        !thirdNext.allocate.receipt.out.ok?.address,
        'allocated memory has no address'
      )

      assert.ok(thirdNext.put.task, 'put task was dispatched')
      assert.ok(thirdNext.put.receipt?.out.ok, 'put receipt was received')

      assert.ok(thirdNext.accept.task, 'accept task was dispatched')
      assert.ok(
        thirdNext.accept.receipt?.out.ok,
        'accept receipt was not received'
      )

      assert.ok(
        thirdNext.accept.receipt?.out.ok?.site,
        'accept receipt has a site'
      )

      assert.ok(thirdNext.accept.site, 'accept site commitment was embedded')
    },
  'blob/accept fails if http/put receipt issued without upload': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)

    // prepare data
    const data = new Uint8Array([11, 22, 34, 44, 55])
    const multihash = await sha256.digest(data)
    const digest = multihash.bytes
    const size = data.byteLength

    // create service connection
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const task = {
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: {
        blob: {
          digest,
          size,
        },
      },
      proofs: [proof],
    }

    // create `blob/add` invocation
    const invocation = BlobCapabilities.add.invoke(task)
    // Invoke `blob/add` for the first time
    const receipt = await invocation.execute(connection)
    if (!receipt.out.ok) {
      throw new Error('invocation failed', { cause: receipt })
    }

    const workflow = parseBlobAddReceiptNext(receipt)

    // got allocation task and receipt
    assert.ok(workflow.allocate.task, 'allocation task was dispatched')
    assert.ok(
      workflow.allocate.receipt.out.ok?.size ?? 0 > 0,
      'allocated memory is greater than 0 bytes'
    )
    assert.ok(
      workflow.allocate.receipt.out.ok?.address,
      'allocated memory has an address'
    )

    assert.ok(workflow.put.task, 'put task was dispatched')
    assert.ok(!workflow.put.receipt, 'put receipt was not received')

    assert.ok(workflow.accept.task, 'accept task was dispatched')
    assert.ok(!workflow.accept.receipt, 'accept receipt was not received')

    /** @type {import('@web3-storage/capabilities/types').BlobAddress} */
    // @ts-expect-error receipt type is unknown
    const address = workflow.allocate.receipt.out.ok.address

    // Invoke `conclude` with `http/put` receipt
    const keys = workflow.put.task.facts[0]['keys']
    // @ts-expect-error Argument of type 'unknown' is not assignable to parameter of type 'SignerArchive<`did:${string}:${string}`, SigAlg>'
    const blobProvider = ed25519.from(keys)
    const httpPutReceipt = await Receipt.issue({
      issuer: blobProvider,
      ran: workflow.put.task.link(),
      result: {
        ok: {},
      },
    })
    const httpPutConcludeInvocation = createConcludeInvocation(
      alice,
      context.id,
      httpPutReceipt
    )
    const ucanConclude = await httpPutConcludeInvocation.execute(connection)
    if (!ucanConclude.out.ok) {
      throw new Error('invocation failed', { cause: ucanConclude.out })
    }

    const accept = await context.agentStore.receipts.get(
      workflow.accept.task.link()
    )
    if (accept.error) {
      throw new Error('accept receipt not found', { cause: accept.error })
    }

    assert.ok(
      String(accept.ok.out.error).match(/Blob not found/),
      'accept was not successful'
    )
  },
  'blob/add fails when a blob with size bigger than maximum size is added':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const digest = multihash.bytes

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // invoke `blob/add`
      const invocation = BlobCapabilities.add.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            digest,
            size: Number.MAX_SAFE_INTEGER,
          },
        },
        proofs: [proof],
      })
      const blobAdd = await invocation.execute(connection)
      if (blobAdd.out.error) {
        throw new Error('invocation should not have failed')
      }

      const work = parseBlobAddReceiptNext(blobAdd)
      assert.ok(work.allocate.task)
      assert.ok(work.allocate.receipt.out.error, 'allocation has failed')
      assert.equal(
        work.allocate.receipt.out.error?.name,
        BlobSizeOutsideOfSupportedRangeName,
        'allocation failed with BlobSizeOutsideOfSupportedRange error'
      )
      assert.ok(work.put.task, 'put task was scheduled')
      assert.ok(work.put.receipt, 'put receipt was received')
      assert.ok(work.put.receipt?.out.error, 'put receipt has an error')
      assert.ok(
        String(work.put.receipt?.out.error?.message).match(
          /Awaited bafy.* at .out.ok.address.url/
        )
      )
    },
  'blob/remove returns receipt with blob size for content allocated in space':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const digest = multihash.bytes
      const size = data.byteLength

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // create `blob/add` invocation
      const blobAddInvocation = BlobCapabilities.add.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          blob: {
            digest,
            size,
          },
        },
        proofs: [proof],
      })
      // Invoke `blob/add` to allocate content
      const blobAdd = await blobAddInvocation.execute(connection)
      if (!blobAdd.out.ok) {
        throw new Error('invocation failed', { cause: blobAdd.out.error })
      }

      // invoke `blob/remove`
      const blobRemoveInvocation = BlobCapabilities.remove.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          digest,
        },
        proofs: [proof],
      })
      const blobRemove = await blobRemoveInvocation.execute(connection)
      if (!blobRemove.out.ok) {
        throw new Error('invocation failed', { cause: blobRemove.out.error })
      }

      assert.ok(blobRemove.out.ok)
      assert.equal(blobRemove.out.ok.size, size)
    },
  'blob/remove returns receipt with size 0 for non existent content in space':
    async (assert, context) => {
      const { proof, spaceDid } = await registerSpace(alice, context)

      // prepare data
      const data = new Uint8Array([11, 22, 34, 44, 55])
      const multihash = await sha256.digest(data)
      const digest = multihash.bytes

      // create service connection
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      // invoke `blob/remove`
      const blobRemoveInvocation = BlobCapabilities.remove.invoke({
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        nb: {
          digest,
        },
        proofs: [proof],
      })
      const blobRemove = await blobRemoveInvocation.execute(connection)
      if (!blobRemove.out.ok) {
        throw new Error('invocation failed', { cause: blobRemove.out.error })
      }

      assert.ok(blobRemove.out.ok)
      assert.equal(blobRemove.out.ok.size, 0)
    },
  'blob/list does not fail for empty list': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const blobList = await BlobCapabilities.list
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {},
      })
      .execute(connection)

    assert.deepEqual(blobList.out.ok, { results: [], size: 0 })
  },
  'blob/list returns blobs previously stored by the user': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = [
      new Uint8Array([11, 22, 34, 44, 55]),
      new Uint8Array([22, 34, 44, 55, 66]),
    ]
    const receipts = []
    for (const datum of data) {
      const multihash = await sha256.digest(datum)
      const digest = multihash.bytes
      const size = datum.byteLength
      const blobAdd = await BlobCapabilities.add
        .invoke({
          issuer: alice,
          audience: connection.id,
          with: spaceDid,
          nb: {
            blob: {
              digest,
              size,
            },
          },
          proofs: [proof],
        })
        .execute(connection)

      if (blobAdd.out.error) {
        throw new Error('invocation failed', { cause: blobAdd })
      }

      receipts.push(blobAdd)
    }

    const blobList = await BlobCapabilities.list
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {},
      })
      .execute(connection)

    if (blobList.out.error) {
      throw new Error('invocation failed', { cause: blobList })
    }
    assert.equal(blobList.out.ok.size, receipts.length)
    // list order last-in-first-out
    const listReverse = await Promise.all(
      data
        .reverse()
        .map(async (datum) => ({ digest: (await sha256.digest(datum)).bytes }))
    )
    assert.deepEqual(
      blobList.out.ok.results.map(({ blob }) => ({ digest: blob.digest })),
      listReverse
    )
  },
  'blob/list can be paginated with custom size': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = [
      new Uint8Array([11, 22, 34, 44, 55]),
      new Uint8Array([22, 34, 44, 55, 66]),
    ]

    for (const datum of data) {
      const multihash = await sha256.digest(datum)
      const digest = multihash.bytes
      const size = datum.byteLength
      const blobAdd = await BlobCapabilities.add
        .invoke({
          issuer: alice,
          audience: connection.id,
          with: spaceDid,
          nb: {
            blob: {
              digest,
              size,
            },
          },
          proofs: [proof],
        })
        .execute(connection)

      if (blobAdd.out.error) {
        throw new Error('invocation failed', { cause: blobAdd })
      }
    }

    // Get list with page size 1 (two pages)
    const size = 1
    const listPages = []
    /** @type {string} */
    let cursor = ''

    do {
      const blobList = await BlobCapabilities.list
        .invoke({
          issuer: alice,
          audience: connection.id,
          with: spaceDid,
          proofs: [proof],
          nb: {
            size,
            ...(cursor ? { cursor } : {}),
          },
        })
        .execute(connection)

      if (blobList.out.error) {
        throw new Error('invocation failed', { cause: blobList })
      }

      // Add page if it has size
      blobList.out.ok.size > 0 && listPages.push(blobList.out.ok.results)

      if (blobList.out.ok.after) {
        cursor = blobList.out.ok.after
      } else {
        break
      }
    } while (cursor)

    assert.equal(
      listPages.length,
      data.length,
      'has number of pages of added CARs'
    )

    // Inspect content
    const blobList = listPages.flat()
    const listReverse = await Promise.all(
      data
        .reverse()
        .map(async (datum) => ({ digest: (await sha256.digest(datum)).bytes }))
    )
    assert.deepEqual(
      blobList.map(({ blob }) => ({ digest: blob.digest })),
      listReverse
    )
  },
}
