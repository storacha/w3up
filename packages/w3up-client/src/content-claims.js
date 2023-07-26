import { MultihashIndexSortedWriter } from 'cardex/multihash-index-sorted'
import { CARReaderStream } from 'carstream'
import Queue from 'p-queue'
import { CAR } from '@web3-storage/upload-client'
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'

export class ContentClaimsBuilder {
  #store
  #queue
  /** @type {import('multiformats').UnknownLink|undefined} */
  #root
  /** @type {import('./types').CARLink[]} */
  #shards

  /**
   * @param {import('./capability/store').StoreClient} store 
   */
  constructor (store) {
    this.#store = store
    this.#queue = new Queue()
    this.#shards = []
  }

  /**
   * @param {import('./types').CARLink} shard 
   * @param {Blob} data
   */
  async addShard (shard, data) {
    this.#shards.push(shard)
    this.#queue.add(async () => {
      const { readable, writable } = new TransformStream()
      const writer = MultihashIndexSortedWriter.createWriter({ writer: writable.getWriter() })

      const [, indexBlock] = await Promise.all([
        data.stream()
          .pipeThrough(new CARReaderStream())
          .pipeTo(new WritableStream({
            async write (block) { await writer.add(block.cid, block.offset) },
            async close () { await writer.close() }
          })),
        (async () => {
          const bytes = new Uint8Array(await new Response(readable).arrayBuffer())
          const cid = Link.create(MultihashIndexSortedWriter.codec, await sha256.digest(bytes))
          return { cid, bytes }
        })()
      ])

      const car = await CAR.encode([indexBlock], indexBlock.cid)
      const indexCARCID = await this.#store.add(car)

      // TODO: create inclusion claim for shard => indexBlock.cid
      // TODO: create partition claim for indexBlock.cid => indexCARCID
      // TODO: create relation claims for block => shard => indexBlock.cid => indexCARCID
    })
    return this
  }

  /**
   * @param {import('multiformats').UnknownLink} root
   */
  setRoot (root) {
    this.#root = root
    return this
  }

  async close () {
    await this.#queue.onIdle()
    // TODO: generate partition claim for root
  }
}