import { createServer, connect } from '../src/lib.js'
import * as API from '../src/types.js'
import * as Signer from '@ucanto/principal/ed25519'
import { CID } from 'multiformats'
import * as CAR from '@ucanto/transport/car'
import { base64pad } from 'multiformats/bases/base64'
import * as Link from '@ucanto/core/link'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import { createSpace, registerSpace } from './util.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'store/add returns signed url for uploading': async (assert, context) => {
    const alice = await Signer.generate()
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const link = await CAR.codec.link(data)
    const size = data.byteLength

    const invocation = StoreCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: { link, size },
      proofs: [proof],
    })

    // invoke a store/add with proof
    const storeAdd = await invocation.execute(connection)

    if (storeAdd.error) {
      throw new Error('invocation failed', { cause: storeAdd })
    }

    assert.equal(storeAdd.status, 'upload')
    assert.equal(storeAdd.with, spaceDid)
    assert.deepEqual(storeAdd.link, link)

    assert.equal(storeAdd.headers?.['content-length'], String(size))
    assert.deepEqual(
      storeAdd.headers?.['x-amz-checksum-sha256'],
      base64pad.baseEncode(link.multihash.digest)
    )

    const url = storeAdd.url && new URL(storeAdd.url)
    if (!url) {
      throw new Error('Expected presigned url in response')
    }
    const signedHeaders = url.searchParams.get('X-Amz-SignedHeaders')

    assert.equal(
      signedHeaders,
      'content-length;host;x-amz-checksum-sha256',
      'content-length and checksum must be part of the signature'
    )

    // May have bucket name at start of path
    assert.equal(url.pathname.endsWith(`/${link}/${link}.car`), true)

    const goodPut = await fetch(url, {
      method: 'PUT',
      mode: 'cors',
      body: data,
      headers: storeAdd.headers,
    })

    assert.equal(goodPut.status, 200, await goodPut.text())

    const item = await context.testStoreTable.get(spaceDid, link)

    if (!item) {
      return assert.equal(item != null, true)
    }

    assert.deepEqual(
      {
        space: item.space,
        link: item.link,
        size: item.size,
        issuer: item.issuer,
      },
      {
        space: spaceDid,
        link,
        size: data.byteLength,
        issuer: alice.did(),
      }
    )

    assert.equal(CID.parse(item.invocation.toString()) != null, true)
    assert.equal(
      Date.now() - new Date(item?.insertedAt).getTime() < 60_000,
      true
    )
  },

  'store/add should create a presigned url that can only PUT a payload with the right length':
    async (assert, context) => {
      const alice = await Signer.generate()
      const { proof, spaceDid } = await registerSpace(alice, context)
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      const data = new Uint8Array([11, 22, 34, 44, 55])
      const longer = new Uint8Array([11, 22, 34, 44, 55, 66])
      const link = await CAR.codec.link(data)
      const size = data.byteLength

      const storeAdd = await StoreCapabilities.add
        .invoke({
          issuer: alice,
          audience: context.id,
          with: spaceDid,
          nb: { link, size },
          proofs: [proof],
        })
        .execute(connection)

      if (storeAdd.error) {
        throw new Error('invocation failed', { cause: storeAdd })
      }

      const url = storeAdd.url && new URL(storeAdd.url)
      if (!url) {
        throw new Error('Expected presigned url in response')
      }

      const contentLengthFailSignature = await fetch(url, {
        method: 'PUT',
        mode: 'cors',
        body: longer,
        headers: {
          ...storeAdd.headers,
          'content-length': longer.byteLength.toString(10),
        },
      })

      assert.equal(
        contentLengthFailSignature.status >= 400,
        true,
        'should fail to upload as content-length differs from that used to sign the url'
      )
    },

  'store/add should create a presigned url that can only PUT the exact bytes we signed for':
    async (assert, context) => {
      const alice = await Signer.generate()
      const { proof, spaceDid } = await registerSpace(alice, context)
      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      const data = new Uint8Array([11, 22, 34, 44, 55])
      const other = new Uint8Array([10, 22, 34, 44, 55])
      const link = await CAR.codec.link(data)
      const size = data.byteLength

      const storeAdd = await StoreCapabilities.add
        .invoke({
          issuer: alice,
          audience: context.id,
          with: spaceDid,
          nb: { link, size },
          proofs: [proof],
        })
        .execute(connection)

      if (storeAdd.error) {
        throw new Error('invocation failed', { cause: storeAdd })
      }

      const url = storeAdd.url && new URL(storeAdd.url)
      if (!url) {
        throw new Error('Expected presigned url in response')
      }

      const failChecksum = await fetch(url, {
        method: 'PUT',
        mode: 'cors',
        body: other,
        headers: storeAdd.headers,
      })

      assert.equal(
        failChecksum.status,
        400,
        'should fail to upload any other data.'
      )
    },

  'store/add returns done if already uploaded': async (assert, context) => {
    const alice = await Signer.generate()
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const link = await CAR.codec.link(data)

    const { url, headers } = await context.carStoreBucket.createUploadUrl(
      link,
      data.length
    )

    // simulate an already stored CAR
    const put = await fetch(url, {
      method: 'PUT',
      mode: 'cors',
      body: data,
      headers,
    })
    assert.equal(put.ok, true, 'should be able to upload to presigned url')

    const storeAddInvocation = StoreCapabilities.add.invoke({
      issuer: alice,
      audience: connection.id,
      with: spaceDid,
      nb: { link, size: data.byteLength },
      proofs: [proof],
    })

    const storeAdd = await storeAddInvocation.execute(connection)

    if (storeAdd.error) {
      throw new Error('invocation failed', { cause: storeAdd })
    }

    assert.equal(storeAdd.status, 'done')
    assert.equal(storeAdd.with, spaceDid)
    assert.deepEqual(storeAdd.link, link)
    assert.equal(storeAdd.url == null, true)

    const item = await context.testStoreTable.get(spaceDid, link)
    if (!item) {
      throw assert.equal(item != null, true, 'should have stored item')
    }

    assert.deepEqual(
      {
        space: item.space,
        link: item.link,
        size: item.size,
        issuer: item.issuer,
      },
      {
        space: spaceDid,
        link,
        size: data.byteLength,
        issuer: alice.did(),
      }
    )

    assert.deepEqual(Link.parse(item.invocation.toString()), item.invocation)

    assert.equal(
      Date.now() - new Date(item.insertedAt).getTime() < 60_000,
      true
    )
  },

  'store/add disallowed if invocation fails access verification': async (
    assert,
    context
  ) => {
    const alice = await Signer.generate()
    const { proof, spaceDid } = await createSpace(alice)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const link = await CAR.codec.link(data)

    // invoke a store/add with proof
    const storeAdd = await StoreCapabilities.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { link, size: data.byteLength },
        proofs: [proof],
      })
      .execute(connection)

    assert.equal(storeAdd.error, true)
    assert.equal(
      storeAdd.error && storeAdd.message.includes('no storage'),
      true
    )

    // Register space and retry
    await context.testSpaceRegistry.registerSpace(spaceDid)

    const retryStoreAdd = await StoreCapabilities.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { link, size: data.byteLength },
        proofs: [proof],
      })
      .execute(connection)

    assert.equal(retryStoreAdd.error, undefined)
  },

  'store/add fails when size too large to PUT': async (assert, context) => {
    const alice = await Signer.generate()
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const link = await CAR.codec.link(data)
    const size = context.maxUploadSize + 1
    const storeAdd = await StoreCapabilities.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { link, size },
        proofs: [proof],
      })
      .execute(connection)

    assert.equal(storeAdd.error, true)
    assert.equal(
      storeAdd.error && storeAdd.message.startsWith('Size must not exceed'),
      true
    )
  },

  'store/remove does not fail for non existent link': async (
    assert,
    context
  ) => {
    const alice = await Signer.generate()
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = new Uint8Array([11, 22, 34, 44, 55])
    const link = await CAR.codec.link(data)

    const storeRemove = await StoreCapabilities.remove
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { link },
        proofs: [proof],
      })
      .execute(connection)

    // expect no response for a remove
    assert.deepEqual(storeRemove, {})

    const storeRemove2 = await StoreCapabilities.remove
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { link },
        proofs: [proof],
      })
      .execute(connection)

    // expect no response for a remove
    assert.deepEqual(storeRemove2, {})
  },

  'store/list does not fail for empty list': async (assert, context) => {
    const alice = await Signer.generate()
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const storeList = await StoreCapabilities.list
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {},
      })
      .execute(connection)

    assert.deepEqual(storeList, { results: [], size: 0 })
  },

  'store/list returns items previously stored by the user': async (
    assert,
    context
  ) => {
    const alice = await Signer.generate()
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = [
      new Uint8Array([11, 22, 34, 44, 55]),
      new Uint8Array([22, 34, 44, 55, 66]),
    ]
    const links = []
    for (const datum of data) {
      const storeAdd = await StoreCapabilities.add
        .invoke({
          issuer: alice,
          audience: connection.id,
          with: spaceDid,
          nb: { link: await CAR.codec.link(datum), size: datum.byteLength },
          proofs: [proof],
        })
        .execute(connection)

      if (storeAdd.error) {
        throw new Error('invocation failed', { cause: storeAdd })
      }

      assert.equal(storeAdd.status, 'upload')
      links.push(storeAdd.link)
    }

    const storeList = await StoreCapabilities.list
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {},
      })
      .execute(connection)

    if (storeList.error) {
      throw new Error('invocation failed', { cause: storeList })
    }

    assert.equal(storeList.size, links.length)

    // list order last-in-first-out
    assert.deepEqual(
      storeList.results.map(({ link }) => ({ link, size: 5 })),
      links.reverse().map((link) => ({ link, size: 5 }))
    )
  },

  'store/list can be paginated with custom size': async (assert, context) => {
    const alice = await Signer.generate()
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = [
      new Uint8Array([11, 22, 34, 44, 55]),
      new Uint8Array([22, 34, 44, 55, 66]),
    ]
    const links = []

    for (const datum of data) {
      const storeAdd = await StoreCapabilities.add
        .invoke({
          issuer: alice,
          audience: connection.id,
          with: spaceDid,
          nb: { link: await CAR.codec.link(datum), size: datum.byteLength },
          proofs: [proof],
        })
        .execute(connection)
      if (storeAdd.error) {
        throw new Error('invocation failed', { cause: storeAdd })
      }

      links.push(storeAdd.link)
    }

    // Get list with page size 1 (two pages)
    const size = 1
    const listPages = []
    /** @type {string} */
    let cursor = ''

    do {
      const storeList = await StoreCapabilities.list
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

      if (storeList.error) {
        throw new Error('invocation failed', { cause: storeList })
      }

      // Add page if it has size
      storeList.size > 0 && listPages.push(storeList.results)

      if (storeList.after) {
        cursor = storeList.after
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
    const storeList = listPages.flat()
    assert.deepEqual(
      // list order last-in-first-out
      storeList.map(({ link }) => ({ link, size: 5 })),
      links.reverse().map((link) => ({ link, size: 5 }))
    )
  },

  'store/list can page backwards': async (assert, context) => {
    const alice = await Signer.generate()
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = [
      new Uint8Array([11, 22, 33, 44, 55]),
      new Uint8Array([22, 33, 44, 55, 66]),
      new Uint8Array([33, 44, 55, 66, 77]),
      new Uint8Array([44, 55, 66, 77, 88]),
      new Uint8Array([55, 66, 77, 88, 99]),
      new Uint8Array([66, 77, 88, 99, 11]),
    ]
    const links = []

    for (const datum of data) {
      const storeAdd = await StoreCapabilities.add
        .invoke({
          issuer: alice,
          audience: connection.id,
          with: spaceDid,
          nb: { link: await CAR.codec.link(datum), size: datum.byteLength },
          proofs: [proof],
        })
        .execute(connection)
      if (storeAdd.error) {
        throw new Error('invocation failed', { cause: storeAdd })
      }

      links.push(storeAdd.link)
    }

    const size = 3

    const listResponse = await StoreCapabilities.list
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {
          size,
        },
      })
      .execute(connection)
    if (listResponse.error) {
      throw new Error('invocation failed', { cause: listResponse.error })
    }

    const secondListResponse = await StoreCapabilities.list
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {
          size,
          cursor: listResponse.after,
        },
      })
      .execute(connection)
    if (secondListResponse.error) {
      throw new Error('invocation failed', { cause: secondListResponse.error })
    }

    const prevListResponse = await StoreCapabilities.list
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {
          size,
          cursor: secondListResponse.before,
          pre: true,
        },
      })
      .execute(connection)
    if (prevListResponse.error) {
      throw new Error('invocation failed', { cause: prevListResponse.error })
    }

    assert.equal(listResponse.results.length, 3)
    // listResponse is the first page. we used its after to get the second page, and then used the before of the second
    // page with the `pre` caveat to list the first page again. the results and cursors should remain the same.
    assert.deepEqual(prevListResponse.results[0], listResponse.results[0])
    assert.deepEqual(prevListResponse.results[1], listResponse.results[1])
    assert.deepEqual(prevListResponse.results[2], listResponse.results[2])
    assert.deepEqual(prevListResponse.before, listResponse.before)
    assert.deepEqual(prevListResponse.after, listResponse.after)
  },
}
