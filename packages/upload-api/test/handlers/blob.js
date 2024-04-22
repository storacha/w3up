import * as API from '../../src/types.js'
import { sha256 } from 'multiformats/hashes/sha2'
import { ed25519 } from '@ucanto/principal'
import { Receipt } from '@ucanto/core'
import * as BlobCapabilities from '@web3-storage/capabilities/blob'
import * as HTTPCapabilities from '@web3-storage/capabilities/http'

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

      // Validate receipt structure
      assert.ok(blobAdd.out.ok.site)
      assert.equal(blobAdd.out.ok.site['ucan/await'][0], '.out.ok.site')
      assert.ok(
        blobAdd.out.ok.site['ucan/await'][1].equals(blobAdd.fx.join?.link())
      )
      assert.ok(blobAdd.fx.join)
      assert.equal(blobAdd.fx.fork.length, 3)

      // validate receipt next
      const next = parseBlobAddReceiptNext(blobAdd)
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
      const httpPutGetTask = await context.tasksStorage.get(next.put.task.cid)
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

    // Store allocate receipt to not re-schedule
    const receiptPutRes = await context.receiptsStorage.put(
      firstNext.allocate.receipt
    )
    assert.ok(receiptPutRes.ok)

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

      // Store allocate receipt to not re-schedule
      const receiptPutRes = await context.receiptsStorage.put(
        firstNext.allocate.receipt
      )
      assert.ok(receiptPutRes.ok)

      /** @type {import('@web3-storage/capabilities/types').BlobAddress} */
      // @ts-expect-error receipt type is unknown
      const address = firstNext.allocate.receipt.out.ok.address

      // Store the blob to the address
      const goodPut = await fetch(address.url, {
        method: 'PUT',
        mode: 'cors',
        body: data,
        headers: address.headers,
      })
      assert.equal(goodPut.status, 200, await goodPut.text())

      // Invoke `blob/add` for the second time (after storing the blob but not invoking conclude)
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

      // Store blob/allocate given conclude needs it to schedule blob/accept
      // Store allocate task to be fetchable from allocate
      await context.tasksStorage.put(secondNext.allocate.task)

      // Invoke `conclude` with `http/put` receipt
      const keys = secondNext.put.task.facts[0]['keys']
      // @ts-expect-error Argument of type 'unknown' is not assignable to parameter of type 'SignerArchive<`did:${string}:${string}`, SigAlg>'
      const blobProvider = ed25519.from(keys)
      const httpPut = HTTPCapabilities.put.invoke({
        issuer: blobProvider,
        audience: blobProvider,
        with: blobProvider.toDIDKey(),
        nb: {
          body: {
            digest,
            size,
          },
          url: {
            'ucan/await': ['.out.ok.address.url', secondNext.allocate.task.cid],
          },
          headers: {
            'ucan/await': [
              '.out.ok.address.headers',
              secondNext.allocate.task.cid,
            ],
          },
        },
        facts: secondNext.put.task.facts,
        expiration: Infinity,
      })

      const httpPutDelegation = await httpPut.delegate()
      const httpPutReceipt = await Receipt.issue({
        issuer: blobProvider,
        ran: httpPutDelegation.cid,
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
      const thirdBlobAdd = await invocation.execute(connection)
      if (!thirdBlobAdd.out.ok) {
        throw new Error('invocation failed', { cause: thirdBlobAdd })
      }

      // parse third receipt next
      const thirdNext = parseBlobAddReceiptNext(thirdBlobAdd)
      assert.ok(thirdNext.allocate.task)
      assert.ok(thirdNext.put.task)
      assert.ok(thirdNext.accept.task)
      assert.ok(thirdNext.allocate.receipt)
      assert.ok(thirdNext.put.receipt)
      assert.ok(thirdNext.accept.receipt)

      assert.ok(thirdNext.allocate.receipt.out.ok?.address)
      assert.deepEqual(thirdNext.put.receipt?.out.ok, {})
      assert.ok(thirdNext.accept.receipt?.out.ok?.site)
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
      if (!blobAdd.out.error) {
        throw new Error('invocation should have failed')
      }
      assert.ok(blobAdd.out.error, 'invocation should have failed')
      assert.equal(blobAdd.out.error.name, BlobSizeOutsideOfSupportedRangeName)
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
          content: digest,
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
          content: digest,
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
