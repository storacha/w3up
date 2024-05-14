import { createServer, connect } from '../../src/lib.js'
import * as API from '../../src/types.js'
import * as CAR from '@ucanto/transport/car'
import { base64pad } from 'multiformats/bases/base64'
import * as Raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Link from 'multiformats/link'
import * as StoreCapabilities from '@web3-storage/capabilities/store'
import { invoke } from '@ucanto/core'
import { alice, bob, createSpace, registerSpace } from '../util.js'
import { Absentee } from '@ucanto/principal'
import { provisionProvider } from '../helpers/utils.js'
import * as Result from '../helpers/result.js'

/**
 * @type {API.Tests}
 */
export const test = {
  'store/add returns signed url for uploading': async (assert, context) => {
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

    if (!storeAdd.out.ok) {
      throw new Error('invocation failed', { cause: storeAdd })
    }
    if (storeAdd.out.ok.status !== 'upload') {
      throw new Error(`unexpected status: ${storeAdd.out.ok.status}`)
    }

    assert.equal(storeAdd.out.ok.with, spaceDid)
    assert.deepEqual(storeAdd.out.ok.link.toString(), link.toString())

    assert.equal(storeAdd.out.ok.headers?.['content-length'], String(size))
    assert.deepEqual(
      storeAdd.out.ok.headers?.['x-amz-checksum-sha256'],
      base64pad.baseEncode(link.multihash.digest)
    )

    const url = storeAdd.out.ok.url && new URL(storeAdd.out.ok.url)
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
      headers: storeAdd.out.ok.headers,
    })

    assert.equal(goodPut.status, 200, await goodPut.text())

    const item = Result.unwrap(await context.storeTable.get(spaceDid, link))

    assert.deepEqual(
      {
        link: item.link.toString(),
        size: item.size,
      },
      {
        link: link.toString(),
        size: data.byteLength,
      }
    )

    assert.equal(
      Date.now() - new Date(item?.insertedAt).getTime() < 60_000,
      true
    )

    const { spaces } = Result.unwrap(await context.storeTable.inspect(link))
    assert.equal(spaces.length, 1)
    assert.equal(spaces[0].did, spaceDid)
  },

  'store/add should allow add the same content to be stored in multiple spaces':
    async (assert, context) => {
      const { proof: aliceProof, spaceDid: aliceSpaceDid } =
        await registerSpace(alice, context)
      const { proof: bobProof, spaceDid: bobSpaceDid } = await registerSpace(
        bob,
        context,
        'bob'
      )

      const connection = connect({
        id: context.id,
        channel: createServer(context),
      })

      const data = new Uint8Array([11, 22, 34, 44, 55])
      const link = await CAR.codec.link(data)
      const size = data.byteLength

      const aliceStoreAdd = await StoreCapabilities.add
        .invoke({
          issuer: alice,
          audience: context.id,
          with: aliceSpaceDid,
          nb: { link, size },
          proofs: [aliceProof],
        })
        .execute(connection)

      assert.ok(
        aliceStoreAdd.out.ok,
        `Alice failed to store ${link.toString()}`
      )

      const bobStoreAdd = await StoreCapabilities.add
        .invoke({
          issuer: bob,
          audience: context.id,
          with: bobSpaceDid,
          nb: { link, size },
          proofs: [bobProof],
        })
        .execute(connection)

      assert.ok(bobStoreAdd.out.ok, `Bob failed to store ${link.toString()}`)

      const { spaces } = Result.unwrap(await context.storeTable.inspect(link))
      assert.equal(spaces.length, 2)
      const spaceDids = spaces.map((space) => space.did)
      assert.ok(spaceDids.includes(aliceSpaceDid))
      assert.ok(spaceDids.includes(bobSpaceDid))
    },

  'store/add should create a presigned url that can only PUT a payload with the right length':
    async (assert, context) => {
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

      if (!storeAdd.out.ok) {
        throw new Error('invocation failed', { cause: storeAdd })
      }
      if (storeAdd.out.ok.status !== 'upload') {
        throw new Error(`unexpected status: ${storeAdd.out.ok.status}`)
      }

      const url = new URL(storeAdd.out.ok.url)
      if (!url) {
        throw new Error('Expected presigned url in response')
      }

      const contentLengthFailSignature = await fetch(url, {
        method: 'PUT',
        mode: 'cors',
        body: longer,
        headers: {
          ...storeAdd.out.ok.headers,
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

      if (!storeAdd.out.ok) {
        throw new Error('invocation failed', { cause: storeAdd })
      }
      if (storeAdd.out.ok.status !== 'upload') {
        throw new Error(`unexpected status: ${storeAdd.out.ok.status}`)
      }

      const url = new URL(storeAdd.out.ok.url)
      if (!url) {
        throw new Error('Expected presigned url in response')
      }

      const failChecksum = await fetch(url, {
        method: 'PUT',
        mode: 'cors',
        body: other,
        headers: storeAdd.out.ok.headers,
      })

      assert.equal(
        failChecksum.status,
        400,
        'should fail to upload any other data.'
      )
    },

  'store/add returns done if already uploaded': async (assert, context) => {
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

    if (!storeAdd.out.ok) {
      throw new Error('invocation failed', { cause: storeAdd })
    }

    assert.equal(storeAdd.out.ok.status, 'done')
    assert.equal(storeAdd.out.ok.allocated, 5)
    assert.equal(storeAdd.out.ok.with, spaceDid)
    assert.deepEqual(storeAdd.out.ok.link.toString(), link.toString())
    // @ts-expect-error making sure it's not an upload status
    assert.equal(storeAdd.out.ok.url == null, true)

    const item = Result.unwrap(await context.storeTable.get(spaceDid, link))

    assert.deepEqual(
      {
        link: item.link.toString(),
        size: item.size,
      },
      {
        link: link.toString(),
        size: data.byteLength,
      }
    )

    assert.equal(
      Date.now() - new Date(item.insertedAt).getTime() < 60_000,
      true
    )
  },

  'store/add returns allocated: 0 if already added to space': async (
    assert,
    context
  ) => {
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

    const inv0 = StoreCapabilities.add.invoke({
      issuer: alice,
      audience: connection.id,
      with: spaceDid,
      nb: { link, size: data.byteLength },
      nonce: '0',
      proofs: [proof],
    })

    const r0 = await inv0.execute(connection)

    assert.equal(r0.out.ok?.status, 'done')
    assert.equal(r0.out.ok?.allocated, 5)
    assert.equal(r0.out.ok?.with, spaceDid)

    const inv1 = StoreCapabilities.add.invoke({
      issuer: alice,
      audience: connection.id,
      with: spaceDid,
      nb: { link, size: data.byteLength },
      nonce: '1',
      proofs: [proof],
    })

    const r1 = await inv1.execute(connection)

    assert.equal(r1.out.ok?.status, 'done')
    assert.equal(r1.out.ok?.allocated, 0)
    assert.equal(r1.out.ok?.with, spaceDid)
  },

  'store/add disallowed if invocation fails access verification': async (
    assert,
    context
  ) => {
    const { proof, space, spaceDid } = await createSpace(alice)
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

    assert.ok(storeAdd.out.error)
    assert.equal(storeAdd.out.error?.message.includes('no storage'), true)

    // Register space and retry
    const account = Absentee.from({ id: 'did:mailto:test.web3.storage:alice' })
    const providerAdd = await provisionProvider({
      service: /** @type {API.Signer<API.DID<'web'>>} */ (context.signer),
      agent: alice,
      space,
      account,
      connection,
    })
    assert.ok(providerAdd.out.ok)

    const retryStoreAdd = await StoreCapabilities.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { link, size: data.byteLength },
        proofs: [proof],
        nonce: 'retry',
      })
      .execute(connection)

    assert.equal(retryStoreAdd.out.error, undefined)
  },

  'store/add fails when size too large to PUT': async (assert, context) => {
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

    assert.ok(storeAdd.out.error)
    assert.equal(
      storeAdd.out.error?.message.startsWith('Maximum size exceeded:'),
      true
    )
  },

  'store/add fails with non-car link': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const data = new Uint8Array([11, 22, 34, 44, 55])
    /** @type {API.Link<unknown, any>} */
    const link = Link.create(Raw.code, await sha256.digest(data))
    const size = context.maxUploadSize + 1

    // Throws because invocation builder expects CAR link
    try {
      StoreCapabilities.add.invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: {
          link,
          size,
        },
        proofs: [proof],
      })
      assert.ok(false, 'should have throw exception')
    } catch (error) {
      assert.ok(String(error).match(/0x202 codec/))
    }

    // Going around client validation will still fail because server handler
    // expects CAR link.
    const invocation = await invoke({
      issuer: alice,
      audience: connection.id,
      capability: {
        can: 'store/add',
        with: spaceDid,
        nb: {
          link,
          size,
        },
      },

      proofs: [proof],
    }).delegate()

    const [storeAdd] = await connection.execute(invocation)
    assert.ok(storeAdd.out.error)
    assert.ok(storeAdd.out.error?.message.match('0x202 codec'))
  },

  'store/remove fails for non existent link': async (assert, context) => {
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

    assert.equal(storeRemove.out.error?.name, 'StoreItemNotFound')
  },

  'store/list does not fail for empty list': async (assert, context) => {
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

    assert.deepEqual(storeList.out.ok, { results: [], size: 0 })
  },

  'store/list returns items previously stored by the user': async (
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

      if (storeAdd.out.error) {
        throw new Error('invocation failed', { cause: storeAdd })
      }

      assert.equal(storeAdd.out.ok.status, 'upload')
      links.push(storeAdd.out.ok.link)
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

    if (storeList.out.error) {
      throw new Error('invocation failed', { cause: storeList })
    }

    assert.equal(storeList.out.ok.size, links.length)

    // list order last-in-first-out
    assert.deepEqual(
      storeList.out.ok.results.map(({ link }) => ({ link, size: 5 })),
      links.reverse().map((link) => ({ link, size: 5 }))
    )
  },

  'store/list can be paginated with custom size': async (assert, context) => {
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
      if (storeAdd.out.error) {
        throw new Error('invocation failed', { cause: storeAdd })
      }

      links.push(storeAdd.out.ok.link)
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

      if (storeList.out.error) {
        throw new Error('invocation failed', { cause: storeList })
      }

      // Add page if it has size
      storeList.out.ok.size > 0 && listPages.push(storeList.out.ok.results)

      if (storeList.out.ok.after) {
        cursor = storeList.out.ok.after
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
      if (storeAdd.out.error) {
        throw new Error('invocation failed', { cause: storeAdd })
      }

      links.push(storeAdd.out.ok.link)
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
    if (listResponse.out.error) {
      throw new Error('invocation failed', { cause: listResponse.out.error })
    }

    const secondListResponse = await StoreCapabilities.list
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {
          size,
          cursor: listResponse.out.ok.after,
        },
      })
      .execute(connection)
    if (secondListResponse.out.error) {
      throw new Error('invocation failed', {
        cause: secondListResponse.out.error,
      })
    }

    const prevListResponse = await StoreCapabilities.list
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {
          size,
          cursor: secondListResponse.out.ok.before,
          pre: true,
        },
      })
      .execute(connection)
    if (prevListResponse.out.error) {
      throw new Error('invocation failed', {
        cause: prevListResponse.out.error,
      })
    }

    assert.equal(listResponse.out.ok.results.length, 3)
    // listResponse is the first page. we used its after to get the second page, and then used the before of the second
    // page with the `pre` caveat to list the first page again. the results and cursors should remain the same.
    assert.deepEqual(
      prevListResponse.out.ok.results[0],
      listResponse.out.ok.results[0]
    )
    assert.deepEqual(
      prevListResponse.out.ok.results[1],
      listResponse.out.ok.results[1]
    )
    assert.deepEqual(
      prevListResponse.out.ok.results[2],
      listResponse.out.ok.results[2]
    )
    assert.deepEqual(prevListResponse.out.ok.before, listResponse.out.ok.before)
    assert.deepEqual(prevListResponse.out.ok.after, listResponse.out.ok.after)
  },

  'store/get returns shard info': async (assert, context) => {
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

      if (storeAdd.out.error) {
        throw new Error('invocation failed', { cause: storeAdd })
      }

      assert.equal(storeAdd.out.ok.status, 'upload')
      links.push(storeAdd.out.ok.link)
    }

    const storeGet = await StoreCapabilities.get
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {
          link: links[0],
        },
      })
      .execute(connection)

    if (storeGet.out.error) {
      throw new Error('invocation failed', { cause: storeGet })
    }

    assert.deepEqual(storeGet.out.ok.link, links[0])
    assert.equal(storeGet.out.ok.size, data[0].byteLength)
    assert.ok(storeGet.out.ok.insertedAt)
  },

  'store/get returns StoreItemNotFound Failure': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const link = await CAR.codec.link(new Uint8Array([11, 22, 34, 44, 55]))

    const storeGet = await StoreCapabilities.get
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {
          link,
        },
      })
      .execute(connection)

    assert.ok(storeGet.out.error)
    assert.equal(storeGet.out.error?.name, 'StoreItemNotFound')
  },
}
