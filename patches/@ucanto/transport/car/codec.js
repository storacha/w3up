// @ts-nocheck
import { CarReader } from '@ipld/car/reader'
import { createLink } from '@ucanto/core'
import { base32 } from 'multiformats/bases/base32'
import { sha256 } from 'multiformats/hashes/sha2'

import * as CARWriter from '../../../@ipld/car/buffer-writer.js'

export const code = 0x0202

/** @type {import('@ucanto/interface') API}
/**
 * @typedef {API.UCAN.Block<unknown, number, number, 0|1>} Block
 * @typedef {{
 * roots: Block[]
 * blocks: Map<string, Block>
 * }} Model
 */

class Writer {
  /**
   * @param {Block[]} blocks
   * @param {number} byteLength
   */
  constructor(blocks = [], byteLength = 0) {
    this.written = new Set()
    this.blocks = blocks
    this.byteLength = byteLength
  }

  /**
   * @param {Block[]} blocks
   */
  write(...blocks) {
    for (const block of blocks) {
      const id = block.cid.toString(base32)
      if (!this.written.has(id)) {
        this.blocks.push(block)
        this.byteLength += CARWriter.blockLength(
          /** @type {CARWriter.Block} */ (block)
        )
        this.written.add(id)
      }
    }
    return this
  }

  /**
   * @param {Block[]} rootBlocks
   */
  flush(...rootBlocks) {
    const roots = []
    for (const block of rootBlocks.reverse()) {
      const id = block.cid.toString(base32)
      if (!this.written.has(id)) {
        this.blocks.unshift(block)
        this.byteLength += CARWriter.blockLength({
          cid: /** @type {CARWriter.CID} */ (block.cid),
          bytes: block.bytes,
        })
        this.written.add(id)
      }
      roots.push(/** @type {CARWriter.CID} */ (block.cid))
    }

    this.byteLength += CARWriter.headerLength({ roots })

    const buffer = new ArrayBuffer(this.byteLength)
    const writer = CARWriter.createWriter(buffer, { roots })

    for (const block of /** @type {CARWriter.Block[]} */ (this.blocks)) {
      writer.write(block)
    }

    return writer.close()
  }
}

export const createWriter = () => new Writer()

/**
 * @param {Partial<Model>} input
 */
export const encode = ({ roots = [], blocks }) => {
  const writer = new Writer()
  if (blocks) {
    writer.write(...blocks.values())
  }
  return writer.flush(...roots)
}

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<Model>}
 */
export const decode = async (bytes) => {
  const reader = await /** @type {any} */ (CarReader.fromBytes(bytes))
  /** @type {{_header: { roots: CARWriter.CID[] }, _keys: string[], _blocks: UCAN.Block[] }} */
  const { _header, _blocks, _keys } = reader
  const roots = []
  const blocks = new Map()
  const index = _header.roots.map((cid) => _keys.indexOf(String(cid)))

  for (const [n, block] of _blocks.entries()) {
    if (index.includes(n)) {
      roots.push(/** @type {Block} */ (block))
    } else {
      blocks.set(block.cid.toString(), block)
    }
  }

  return { roots, blocks }
}

/**
 * @param {Uint8Array} bytes
 * @param {{hasher?: API.MultihashHasher }} [options]
 */
export const link = async (bytes, { hasher = sha256 } = {}) =>
  /** @type {UCAN.Link<Model, typeof code, number> & import('multiformats').CID} */
  (createLink(code, await hasher.digest(bytes)))

/**
 * @param {Partial<Model>} data
 * @param {{hasher?: API.MultihashHasher }} [options]
 */
export const write = async (data, { hasher = sha256 } = {}) => {
  const bytes = encode(data)
  const cid = await link(bytes)

  return { bytes, cid }
}
