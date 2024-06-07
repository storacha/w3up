import * as API from '../../src/types.js'
import { CAR } from '@ucanto/core'
import * as IndexCapabilities from '@web3-storage/capabilities/index'
import { fromShardArchives } from '@web3-storage/blob-index/util'
import { createServer, connect } from '../../src/lib.js'
import { alice, randomCAR, registerSpace } from '../util.js'
import { uploadBlob } from '../helpers/blob.js'
import * as Result from '../helpers/result.js'

/** @type {API.Tests} */
export const test = {
  'index/add should publish index to IPNI service': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const contentCAR = await randomCAR(32)
    const contentCARBytes = new Uint8Array(await contentCAR.arrayBuffer())

    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // upload the content CAR to the space
    await uploadBlob(
      context,
      {
        connection,
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        proofs: [proof],
      },
      {
        cid: contentCAR.cid,
        bytes: contentCARBytes,
      }
    )

    const index = await fromShardArchives(contentCAR.roots[0], [
      contentCARBytes,
    ])
    const indexCAR = Result.unwrap(await index.archive())
    const indexLink = await CAR.link(indexCAR)

    // upload the index CAR to the space
    await uploadBlob(
      context,
      {
        connection,
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        proofs: [proof],
      },
      {
        cid: indexLink,
        bytes: indexCAR,
      }
    )

    const indexAdd = IndexCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: { index: indexLink },
      proofs: [proof],
    })
    const receipt = await indexAdd.execute(connection)
    Result.try(receipt.out)

    // ensure a result exists for the content root
    assert.ok(
      Result.unwrap(await context.ipniService.query(index.content.multihash))
    )

    for (const shard of index.shards.values()) {
      for (const slice of shard.entries()) {
        // ensure a result exists for each multihash in the index
        assert.ok(Result.unwrap(await context.ipniService.query(slice[0])))
      }
    }
  },
  'index/add should fail if index is not stored in agent space': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const contentCAR = await randomCAR(32)
    const contentCARBytes = new Uint8Array(await contentCAR.arrayBuffer())

    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // upload the content CAR to the space
    await uploadBlob(
      context,
      {
        connection,
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        proofs: [proof],
      },
      {
        cid: contentCAR.cid,
        bytes: contentCARBytes,
      }
    )

    const index = await fromShardArchives(contentCAR.roots[0], [
      contentCARBytes,
    ])
    const indexCAR = Result.unwrap(await index.archive())
    const indexLink = await CAR.link(indexCAR)

    const indexAdd = IndexCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: { index: indexLink },
      proofs: [proof],
    })
    const receipt = await indexAdd.execute(connection)
    assert.ok(receipt.out.error)
    assert.equal(receipt.out.error?.name, 'IndexNotFound')
  },
  'index/add should fail if shard(s) are not stored in agent space': async (
    assert,
    context
  ) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const contentCAR = await randomCAR(32)
    const contentCARBytes = new Uint8Array(await contentCAR.arrayBuffer())

    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    const index = await fromShardArchives(contentCAR.roots[0], [
      contentCARBytes,
    ])
    const indexCAR = Result.unwrap(await index.archive())
    const indexLink = await CAR.link(indexCAR)

    // upload the index CAR to the space
    await uploadBlob(
      context,
      {
        connection,
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        proofs: [proof],
      },
      {
        cid: indexLink,
        bytes: indexCAR,
      }
    )

    const indexAdd = IndexCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: { index: indexLink },
      proofs: [proof],
    })
    const receipt = await indexAdd.execute(connection)
    assert.ok(receipt.out.error)
    assert.equal(receipt.out.error?.name, 'ShardNotFound')
  },
  'index/add should publish index claim': async (assert, context) => {
    const { proof, spaceDid } = await registerSpace(alice, context)
    const contentCAR = await randomCAR(32)
    const contentCARBytes = new Uint8Array(await contentCAR.arrayBuffer())

    const connection = connect({
      id: context.id,
      channel: createServer(context),
    })

    // upload the content CAR to the space
    await uploadBlob(
      context,
      {
        connection,
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        proofs: [proof],
      },
      {
        cid: contentCAR.cid,
        bytes: contentCARBytes,
      }
    )

    const index = await fromShardArchives(contentCAR.roots[0], [
      contentCARBytes,
    ])
    const indexCAR = Result.unwrap(await index.archive())
    const indexLink = await CAR.link(indexCAR)

    // upload the index CAR to the space
    await uploadBlob(
      context,
      {
        connection,
        issuer: alice,
        audience: context.id,
        with: spaceDid,
        proofs: [proof],
      },
      {
        cid: indexLink,
        bytes: indexCAR,
      }
    )

    const indexAdd = IndexCapabilities.add.invoke({
      issuer: alice,
      audience: context.id,
      with: spaceDid,
      nb: { index: indexLink },
      proofs: [proof],
    })
    const receipt = await indexAdd.execute(connection)
    Result.try(receipt.out)

    // ensure an index claim exists for the content root
    const claims = Result.unwrap(
      await context.claimsService.read(contentCAR.roots[0].multihash)
    )

    let found = false
    for (const c of claims) {
      if (
        c.type === 'assert/index' &&
        c.index.toString() === indexLink.toString()
      ) {
        found = true
      }
    }
    assert.ok(found, 'did not found index claim')
  },
}
