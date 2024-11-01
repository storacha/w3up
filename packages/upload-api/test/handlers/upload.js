import * as API from '../../src/types.js'
import {
  alice,
  bob,
  registerSpace,
  randomCAR,
  createSpace,
  service,
} from '../util.js'
import { createServer, connect } from '../../src/lib.js'
import { Upload } from '@storacha/capabilities'
import * as Result from '../helpers/result.js'

// https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/classes/batchwriteitemcommand.html
const BATCH_MAX_SAFE_LIMIT = 25

/**
 * @type {API.Tests}
 */
export const test = {
  'upload/add inserts into DB mapping between data CID and car CIDs': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const car = await randomCAR(128)
    const otherCar = await randomCAR(40)

    // invoke a upload/add with proof
    const [root] = car.roots
    const shards = [car.cid, otherCar.cid].sort()

    const uploadAdd = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root, shards },
        proofs: [proof],
      })
      .execute(connection)

    if (uploadAdd.out.error) {
      throw new Error('invocation failed', { cause: uploadAdd })
    }

    assert.equal(uploadAdd.out.ok.root.toString(), root.toString())
    assert.deepEqual(
      uploadAdd.out.ok.shards?.map(String).sort(),
      shards.map(String).sort()
    )

    const { results } = Result.unwrap(await context.uploadTable.list(spaceDid))
    assert.deepEqual(results.length, 1)

    const [item] = results
    assert.deepEqual(item.root.toString(), root.toString())
    assert.deepEqual(item.shards?.map(String).sort(), shards.map(String).sort())

    const msAgo = Date.now() - new Date(item.insertedAt).getTime()
    assert.equal(msAgo < 60_000, true)
    assert.equal(msAgo >= 0, true)

    const { spaces } = Result.unwrap(await context.uploadTable.inspect(root))
    assert.equal(spaces.length, 1)
    assert.equal(spaces[0].did, spaceDid)
  },

  'upload/add should allow the same content to be uploaded to multiple spaces':
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

      const car = await randomCAR(128)
      const otherCar = await randomCAR(40)

      // invoke a upload/add with proof
      const [root] = car.roots
      const shards = [car.cid, otherCar.cid].sort()

      const aliceUploadAdd = await Upload.add
        .invoke({
          issuer: alice,
          audience: connection.id,
          with: aliceSpaceDid,
          nb: { root, shards },
          proofs: [aliceProof],
        })
        .execute(connection)
      assert.ok(
        aliceUploadAdd.out.ok,
        `Alice failed to upload ${root.toString()}`
      )

      const bobUploadAdd = await Upload.add
        .invoke({
          issuer: bob,
          audience: connection.id,
          with: bobSpaceDid,
          nb: { root, shards },
          proofs: [bobProof],
        })
        .execute(connection)
      assert.ok(bobUploadAdd.out.ok, `Bob failed to upload ${root.toString()}`)

      const { spaces } = Result.unwrap(await context.uploadTable.inspect(root))
      assert.equal(spaces.length, 2)
      const spaceDids = spaces.map((space) => space.did)
      assert.ok(spaceDids.includes(aliceSpaceDid))
      assert.ok(spaceDids.includes(bobSpaceDid))
    },

  'upload/add does not fail with no shards provided': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const car = await randomCAR(128)

    // invoke a upload/add with proof
    const [root] = car.roots

    const uploadAdd = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root },
        proofs: [proof],
      })
      .execute(connection)

    if (!uploadAdd.out.ok) {
      throw new Error('invocation failed', { cause: uploadAdd })
    }

    assert.deepEqual(
      uploadAdd.out.ok.shards,
      [],
      'Should have an empty shards array'
    )

    const { results } = Result.unwrap(await context.uploadTable.list(spaceDid))
    assert.equal(results.length, 1)
    const [upload] = results
    assert.deepEqual(upload.shards, [])
  },

  'upload/add can add shards to an existing item with no shards': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const car = await randomCAR(128)
    const shards = [car.cid]

    // invoke a upload/add with proof
    const [root] = car.roots

    const uploadAdd1 = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root },
        proofs: [proof],
      })
      .execute(connection)

    if (!uploadAdd1.out.ok) {
      throw new Error('invocation failed', { cause: uploadAdd1 })
    }

    assert.deepEqual(uploadAdd1.out.ok.shards, [])

    const uploadAdd2 = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root, shards },
        proofs: [proof],
      })
      .execute(connection)

    if (!uploadAdd2.out.ok) {
      throw new Error('invocation failed', { cause: uploadAdd2 })
    }

    assert.deepEqual(
      uploadAdd2.out.ok.shards?.map(String).sort(),
      shards.map(String).sort()
    )

    const { results } = Result.unwrap(await context.uploadTable.list(spaceDid))
    assert.equal(results.length, 1)
    const [upload] = results
    assert.equal(upload.root.toString(), root.toString())
    assert.deepEqual(
      upload.shards?.map(String).sort(),
      shards.map(String).sort()
    )
  },

  'upload/add merges shards to an existing item with shards': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const cars = await Promise.all([
      randomCAR(128),
      randomCAR(128),
      randomCAR(128),
    ])

    const [root] = cars[2].roots

    const uploadAdd1 = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root, shards: [cars[0].cid, cars[1].cid] },
        proofs: [proof],
      })
      .execute(connection)

    if (!uploadAdd1.out.ok) {
      throw new Error('invocation failed', { cause: uploadAdd1 })
    }

    assert.deepEqual(
      uploadAdd1.out.ok.shards?.map(String).sort(),
      [cars[0].cid, cars[1].cid].map(String).sort()
    )

    const uploadAdd2 = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root, shards: [cars[1].cid, cars[2].cid] },
        proofs: [proof],
      })
      .execute(connection)

    if (!uploadAdd2.out.ok) {
      throw new Error('invocation failed', { cause: uploadAdd2 })
    }

    assert.deepEqual(
      uploadAdd2.out.ok.shards?.map(String).sort(),
      [cars[0].cid, cars[1].cid, cars[2].cid].map(String).sort()
    )

    const { results } = Result.unwrap(await context.uploadTable.list(spaceDid))
    assert.equal(results.length, 1)
    const [upload] = results
    assert.deepEqual(
      {
        root: upload.root.toString(),
        shards: upload.shards?.map(String).sort(),
      },
      {
        root: root.toString(),
        shards: cars.map((car) => car.cid.toString()).sort(),
      }
    )
  },

  'upload/add disallowed if invocation fails access verification': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await createSpace(alice)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const car = await randomCAR(128)
    const otherCar = await randomCAR(40)

    // invoke a upload/add with proof
    const [root] = car.roots
    const shards = [car.cid, otherCar.cid].sort()

    const uploadAdd = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root, shards },
        proofs: [proof],
      })
      .execute(connection)
    if (!uploadAdd.out.error) {
      throw new Error('invocation should have failed')
    }
    assert.equal(
      uploadAdd.out.error.message.includes('has no storage provider'),
      true
    )
  },

  'upload/remove removes an upload': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const car = await randomCAR(128)

    const [root] = car.roots

    // Add upload to space
    const uploadAdd = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root: car.roots[0], shards: [car.cid] },
        proofs: [proof],
      })
      .execute(connection)
    if (!uploadAdd.out.ok) {
      throw new Error('invocation failed', { cause: uploadAdd })
    }

    const uploadRemove = await Upload.remove
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root },
        proofs: [proof],
      })
      .execute(connection)

    if (uploadRemove === undefined) {
      throw new Error(
        'expected upload/remove response to include the upload object removed'
      )
    }

    if (!uploadRemove.out.ok) {
      throw new Error(
        'expected upload/remove response to include the upload object removed',
        { cause: uploadRemove.out.error }
      )
    }

    assert.ok(uploadRemove.out.ok.root)
    assert.equal(uploadRemove.out.ok.root?.toString(), car.roots[0].toString())
    assert.equal(
      uploadRemove?.out.ok.shards?.[0].toString(),
      car.cid.toString()
    )
  },

  'upload/remove fails for non existent upload': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const car = await randomCAR(128)

    // invoke a upload/add with proof
    const [root] = car.roots

    const uploadRemove = await Upload.remove
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root },
        proofs: [proof],
      })
      .execute(connection)

    assert.equal(uploadRemove.out.error?.name, 'UploadNotFound')
  },

  'upload/remove only removes an upload for the given space': async (
    assert,
    context
  ) => {
    const { proof: proofSpaceA, spaceDid: spaceDidA } = await registerSpace(
      alice,
      context
    )
    const { proof: proofSpaceB, spaceDid: spaceDidB } = await registerSpace(
      alice,
      context
    )
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const carA = await randomCAR(128)
    const carB = await randomCAR(40)

    // Invoke two upload/add for spaceA and one upload/add for spaceB

    // Upload CarA to SpaceA
    const uploadAddCarAToSpaceA = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDidA,
        nb: { root: carA.roots[0], shards: [carA.cid, carB.cid] },
        proofs: [proofSpaceA],
      })
      .execute(connection)
    if (uploadAddCarAToSpaceA.out.error) {
      throw new Error('invocation failed', { cause: uploadAddCarAToSpaceA })
    }

    // Upload CarB to SpaceA
    const uploadAddCarBToSpaceA = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDidA,
        nb: { root: carB.roots[0], shards: [carB.cid, carA.cid] },
        proofs: [proofSpaceA],
      })
      .execute(connection)
    if (uploadAddCarBToSpaceA.out.error) {
      throw new Error('invocation failed', { cause: uploadAddCarBToSpaceA })
    }

    // Upload CarA to SpaceB
    const uploadAddCarAToSpaceB = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDidB,
        nb: { root: carA.roots[0], shards: [carA.cid, carB.cid] },
        proofs: [proofSpaceB],
      })
      .execute(connection)
    if (uploadAddCarAToSpaceB.out.error) {
      throw new Error('invocation failed', { cause: uploadAddCarAToSpaceB })
    }

    // Remove CarA from SpaceA
    await Upload.remove
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDidA,
        nb: { root: carA.roots[0] },
        proofs: [proofSpaceA],
      })
      .execute(connection)

    const { results: spaceAItems } = Result.unwrap(
      await context.uploadTable.list(spaceDidA)
    )
    assert.equal(
      spaceAItems.some((x) => x.root.toString() === carA.roots[0].toString()),
      false,
      'SpaceA should not have upload for carA.root'
    )

    assert.equal(
      spaceAItems.some((x) => x.root.toString() === carB.roots[0].toString()),
      true,
      'SpaceA should have upload for carB.root'
    )

    const { results: spaceBItems } = Result.unwrap(
      await context.uploadTable.list(spaceDidB)
    )
    assert.equal(
      spaceBItems.some((x) => x.root.toString() === carB.roots[0].toString()),
      false,
      'SpaceB should not have upload for carB.root'
    )

    assert.equal(
      spaceBItems.some((x) => x.root.toString() === carA.roots[0].toString()),
      true,
      'SpaceB should have upload for carA.root'
    )
  },

  'upload/remove removes all entries when larger than batch limit': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // create upload with more shards than dynamo batch limit
    const cars = await Promise.all(
      Array.from({ length: BATCH_MAX_SAFE_LIMIT + 1 }).map(() => randomCAR(40))
    )
    const [root] = cars[0].roots
    const shards = cars.map((c) => c.cid)

    const uploadAdd = await Upload.add
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root, shards },
        proofs: [proof],
      })
      .execute(connection)

    if (!uploadAdd.out.ok) {
      throw new Error('invocation failed', { cause: uploadAdd })
    }

    assert.equal(uploadAdd.out.ok.shards?.length, shards.length)

    // Validate DB before remove
    const { results } = Result.unwrap(await context.uploadTable.list(spaceDid))
    assert.equal(results.length, 1)

    // Remove Car from Space
    await Upload.remove
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        nb: { root },
        proofs: [proof],
      })
      .execute(connection)

    const { results: resultsAfter } = Result.unwrap(
      await context.uploadTable.list(spaceDid)
    )
    assert.equal(resultsAfter.length, 0)
  },

  'upload/list does not fail for empty list': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const uploadList = await Upload.list
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {},
      })
      .execute(connection)

    assert.deepEqual(uploadList.out.ok, { results: [], size: 0 })
  },

  'upload/list returns entries previously uploaded by the user': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // invoke multiple upload/add with proof
    const cars = [await randomCAR(128), await randomCAR(128)]

    for (const car of cars) {
      await Upload.add
        .invoke({
          issuer: alice,
          audience: connection.id,
          with: spaceDid,
          nb: { root: car.roots[0], shards: [car.cid] },
          proofs: [proof],
        })
        .execute(connection)
    }

    const uploadList = await Upload.list
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {},
      })
      .execute(connection)

    if (!uploadList.out.ok) {
      throw new Error('invocation failed', { cause: uploadList })
    }

    assert.equal(uploadList.out.ok.size, cars.length)

    for (const car of cars) {
      const root = car.roots[0]
      const item = uploadList.out.ok.results.find(
        (x) => x.root.toString() === root.toString()
      )

      assert.deepEqual(item?.root.toString(), root.toString())
      assert.deepEqual(item?.shards?.map(String), [car.cid.toString()])
    }
  },

  'upload/list can be paginated with custom size': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // invoke multiple upload/add with proof
    const cars = [await randomCAR(128), await randomCAR(128)]

    for (const car of cars) {
      await Upload.add
        .invoke({
          issuer: alice,
          audience: connection.id,
          with: spaceDid,
          nb: { root: car.roots[0], shards: [car.cid] },
          proofs: [proof],
        })
        .execute(connection)
    }

    // Get list with page size 1 (two pages)
    const size = 1
    const listPages = []
    let cursor = ''

    do {
      const uploadList = await Upload.list
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

      if (!uploadList.out.ok) {
        throw new Error('invocation failed', { cause: uploadList })
      }

      // Add page if it has size
      if (uploadList.out.ok.size > 0) {
        listPages.push(uploadList.out.ok.results)
      }

      if (uploadList.out.ok.cursor) {
        cursor = uploadList.out.ok.cursor
      } else {
        break
      }
    } while (cursor)

    assert.equal(
      listPages.length,
      cars.length,
      'has number of pages of added CARs'
    )

    // Inspect content
    const uploadList = listPages.flat()
    for (const entry of uploadList) {
      assert.equal(
        cars.some((car) => car.roots[0].toString() === entry.root.toString()),
        true
      )
    }
  },
  'upload/list can page backwards': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // invoke multiple upload/add with proof
    const cars = [
      await randomCAR(128),
      await randomCAR(128),
      await randomCAR(128),
      await randomCAR(128),
      await randomCAR(128),
      await randomCAR(128),
    ]

    for (const car of cars) {
      await Upload.add
        .invoke({
          issuer: alice,
          audience: connection.id,
          with: spaceDid,
          nb: { root: car.roots[0], shards: [car.cid] },
          proofs: [proof],
        })
        .execute(connection)
    }

    const size = 3

    const listResponse = await Upload.list
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
    if (!listResponse.out.ok) {
      throw new Error('invocation failed', { cause: listResponse.out.error })
    }

    const secondListResponse = await Upload.list
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
    if (!secondListResponse.out.ok) {
      throw new Error('invocation failed', {
        cause: secondListResponse.out.error,
      })
    }

    const prevListResponse = await Upload.list
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
    if (!prevListResponse.out.ok) {
      throw new Error('invocation failed', {
        cause: prevListResponse.out.error,
      })
    }

    assert.equal(listResponse.out.ok.results.length, 3)
    assert.equal(prevListResponse.out.ok.results.length, 3)

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
    assert.equal(prevListResponse.out.ok.before, listResponse.out.ok.before)
    assert.equal(prevListResponse.out.ok.after, listResponse.out.ok.after)
  },
  'invoking with wrong audience fails': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const car = await randomCAR(128)

    const result = await Upload.remove
      .invoke({
        issuer: alice,
        audience: service.withDID('did:web:example.com'),
        with: spaceDid,
        nb: { root: car.roots[0] },
        proofs: [proof],
      })
      .execute(connection)

    if (!result.out.error) {
      throw new Error('invocation should have failed')
    }

    assert.equal(result.out.error.name, 'InvalidAudience')
    assert.equal(
      result.out.error.message.includes(`${connection.id.did()}`),
      true,
      'mentions expected audience'
    )
    assert.equal(
      result.out.error.message.includes(`did:web:example.com`),
      true,
      'mentions passed audience'
    )
  },

  'upload/get returns info for one upload': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // invoke multiple upload/add with proof
    const cars = [await randomCAR(128), await randomCAR(128)]

    for (const car of cars) {
      await Upload.add
        .invoke({
          issuer: alice,
          audience: connection.id,
          with: spaceDid,
          nb: { root: car.roots[0], shards: [car.cid] },
          proofs: [proof],
        })
        .execute(connection)
    }

    const uploadGet = await Upload.get
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {
          root: cars[0].roots[0],
        },
      })
      .execute(connection)

    if (!uploadGet.out.ok) {
      throw new Error('invocation failed', { cause: uploadGet })
    }

    assert.equal(
      uploadGet.out.ok.shards?.[0].toString(),
      cars[0].cid.toString()
    )
    assert.equal(uploadGet.out.ok.root.toString(), cars[0].roots[0].toString())
  },

  'upload/get returns UploadNotFound when root is not in uploads': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const car = await randomCAR(128)

    const uploadGet = await Upload.get
      .invoke({
        issuer: alice,
        audience: connection.id,
        with: spaceDid,
        proofs: [proof],
        nb: {
          root: car.roots[0],
        },
      })
      .execute(connection)

    assert.equal(uploadGet.out.error?.name, 'UploadNotFound')
  },
}
