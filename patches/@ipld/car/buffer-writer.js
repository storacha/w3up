// @ts-nocheck
import * as CBOR from '@ipld/dag-cbor'
import { Token, Type } from 'cborg'
import { tokensToLength } from 'cborg/length'
import varint from 'varint'

/**
 * @typedef {import('@ipld/car/api').CID} CID
 * @typedef {import('@ipld/car/api').Block} Block
 * @typedef {import('@ipld/car/api').CarBufferWriter} Writer
 * @typedef {import('@ipld/car/api').CarBufferWriterOptions} Options
 */

/**
 * A simple CAR writer that writes to a pre-allocated buffer.
 *
 * @class
 * @name CarBufferWriter
 * @implements {Writer}
 */
class CarBufferWriter {
  /**
   * @param {Uint8Array} bytes
   * @param {number} headerSize
   */
  constructor(bytes, headerSize) {
    /** @readonly */
    this.bytes = bytes
    this.byteOffset = headerSize

    /**
     * @readonly
     * @type {CID[]}
     */
    this.roots = []
    this.headerSize = headerSize
  }

  /**
   * Add a root to this writer, to be used to create a header when the CAR is
   * finalized with {@link CarBufferWriter.close `close()`}
   *
   * @param {CID} root
   * @param {{resize?:boolean}} [options]
   * @returns {CarBufferWriter}
   */
  addRoot(root, options) {
    addRoot(this, root, options)
    return this
  }

  /**
   * Write a `Block` (a `{ cid:CID, bytes:Uint8Array }` pair) to the archive.
   * Throws if there is not enough capacity.
   *
   * @param {Block} block A `{ cid:CID, bytes:Uint8Array }` pair.
   * @returns {CarBufferWriter}
   */
  write(block) {
    addBlock(this, block)
    return this
  }

  /**
   * Finalize the CAR and return it as a `Uint8Array`.
   *
   * @param {object} [options]
   * @param {boolean} [options.resize]
   * @returns {Uint8Array}
   */
  close(options) {
    return close(this, options)
  }
}

/**
 * @param {CarBufferWriter} writer
 * @param {CID} root
 * @param {{resize?:boolean}} options
 */
export const addRoot = (writer, root, { resize = false } = {}) => {
  const { bytes, headerSize, byteOffset, roots } = writer
  writer.roots.push(root)
  const size = headerLength(writer)
  // If there is not enough space for the new root
  if (size > headerSize) {
    // Check if we root would fit if we were to resize the head.
    if (size - headerSize + byteOffset < bytes.byteLength) {
      // If resize is enabled resize head
      if (resize) {
        resizeHeader(writer, size)
        // otherwise remove head and throw an error suggesting to resize
      } else {
        roots.pop()
        throw new RangeError(`Header of size ${headerSize} has no capacity for new root ${root}.
  However there is a space in the buffer and you could call addRoot(root, { resize: root }) to resize header to make a space for this root.`)
      }
      // If head would not fit even with resize pop new root and throw error
    } else {
      roots.pop()
      throw new RangeError(`Buffer has no capacity for a new root ${root}`)
    }
  }
}

/**
 * Calculates number of bytes required for storing given block in CAR. Useful in
 * estimating size of an `ArrayBuffer` for the `CarBufferWriter`.
 *
 * @name CarBufferWriter.blockLength(Block)
 * @param {Block} block
 * @returns {number}
 */
export const blockLength = ({ cid, bytes }) => {
  const size = cid.bytes.byteLength + bytes.byteLength
  return varint.encodingLength(size) + size
}

/**
 * @param {CarBufferWriter} writer
 * @param {Block} block
 */
export const addBlock = (writer, { cid, bytes }) => {
  const byteLength = cid.bytes.byteLength + bytes.byteLength
  const size = varint.encode(byteLength)
  if (writer.byteOffset + size.length + byteLength > writer.bytes.byteLength) {
    throw new RangeError('Buffer has no capacity for this block')
  } else {
    writeBytes(writer, size)
    writeBytes(writer, cid.bytes)
    writeBytes(writer, bytes)
  }
}

/**
 * @param {CarBufferWriter} writer
 * @param {object} [options]
 * @param {boolean} [options.resize]
 */
export const close = (writer, { resize = false } = {}) => {
  const { roots, bytes, byteOffset, headerSize } = writer

  const headerBytes = CBOR.encode({ version: 1, roots })
  const varintBytes = varint.encode(headerBytes.length)

  const size = varintBytes.length + headerBytes.byteLength
  const offset = headerSize - size

  // If header size estimate was accurate we just write header and return
  // view into buffer.
  if (offset === 0) {
    writeHeader(writer, varintBytes, headerBytes)
    return bytes.subarray(0, byteOffset)
    // If header was overestimated and `{resize: true}` is passed resize header
  } else if (resize) {
    resizeHeader(writer, size)
    writeHeader(writer, varintBytes, headerBytes)
    return bytes.subarray(0, writer.byteOffset)
  } else {
    throw new RangeError(`Header size was overestimated.
You can use close({ resize: true }) to resize header`)
  }
}

/**
 * @param {CarBufferWriter} writer
 * @param {number} byteLength
 */
export const resizeHeader = (writer, byteLength) => {
  const { bytes, headerSize } = writer
  // Move data section to a new offset
  bytes.set(bytes.subarray(headerSize, writer.byteOffset), byteLength)
  // Update header size & byteOffset
  writer.byteOffset += byteLength - headerSize
  writer.headerSize = byteLength
}

/**
 * @param {CarBufferWriter} writer
 * @param {number[]|Uint8Array} bytes
 */

const writeBytes = (writer, bytes) => {
  writer.bytes.set(bytes, writer.byteOffset)
  writer.byteOffset += bytes.length
}
/**
 * @param {{bytes:Uint8Array}} writer
 * @param {number[]} varint
 * @param {Uint8Array} header
 */
const writeHeader = ({ bytes }, varint, header) => {
  bytes.set(varint)
  bytes.set(header, varint.length)
}

const headerPreludeTokens = [
  new Token(Type.map, 2),
  new Token(Type.string, 'version'),
  new Token(Type.uint, 1),
  new Token(Type.string, 'roots'),
]

const CID_TAG = new Token(Type.tag, 42)

/**
 * Calculates header size given the array of byteLength for roots.
 *
 * @name CarBufferWriter.calculateHeaderLength(rootLengths)
 * @param {number[]} rootLengths
 * @returns {number}
 */
export const calculateHeaderLength = (rootLengths) => {
  const tokens = [...headerPreludeTokens]
  tokens.push(new Token(Type.array, rootLengths.length))
  for (const rootLength of rootLengths) {
    tokens.push(CID_TAG)
    tokens.push(new Token(Type.bytes, { length: rootLength + 1 }))
  }
  const length = tokensToLength(tokens) // no options needed here because we have simple tokens
  return varint.encodingLength(length) + length
}

/**
 * Calculates header size given the array of roots.
 *
 * @name CarBufferWriter.headerLength({ roots })
 * @param {object} options
 * @param {CID[]} options.roots
 * @returns {number}
 */
export const headerLength = ({ roots }) =>
  calculateHeaderLength(roots.map((cid) => cid.bytes.byteLength))

/**
 * Estimates header size given a count of the roots and the expected byte length
 * of the root CIDs. The default length works for a standard CIDv1 with a
 * single-byte multihash code, such as SHA2-256 (i.e. the most common CIDv1).
 *
 * @name CarBufferWriter.estimateHeaderLength(rootCount[, rootByteLength])
 * @param {number} rootCount
 * @param {number} [rootByteLength]
 * @returns {number}
 */
export const estimateHeaderLength = (rootCount, rootByteLength = 36) =>
  calculateHeaderLength(new Array(rootCount).fill(rootByteLength))

/**
 * Creates synchronous CAR writer that can be used to encode blocks into a given
 * buffer. Optionally you could pass `byteOffset` and `byteLength` to specify a
 * range inside buffer to write into. If car file is going to have `roots` you
 * need to either pass them under `options.roots` (from which header size will
 * be calculated) or provide `options.headerSize` to allocate required space
 * in the buffer. You may also provide known `roots` and `headerSize` to
 * allocate space for the roots that may not be known ahead of time.
 *
 * Note: Incorrect `headerSize` may lead to copying bytes inside a buffer
 * which will have a negative impact on performance.
 *
 * @name CarBufferWriter.createWriter(buffer[, options])
 * @param {ArrayBuffer} buffer
 * @param {object} [options]
 * @param {CID[]} [options.roots]
 * @param {number} [options.byteOffset]
 * @param {number} [options.byteLength]
 * @param {number} [options.headerSize]
 * @returns {CarBufferWriter}
 */
export const createWriter = (
  buffer,
  {
    roots = [],
    byteOffset = 0,
    byteLength = buffer.byteLength,
    headerSize = headerLength({ roots }),
  } = {}
) => {
  const bytes = new Uint8Array(buffer, byteOffset, byteLength)

  const writer = new CarBufferWriter(bytes, headerSize)
  for (const root of roots) {
    writer.addRoot(root)
  }

  return writer
}
