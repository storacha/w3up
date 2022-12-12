import varint from 'varint'
import { decode as decodeDagCbor } from '@ipld/dag-cbor'
import { CID } from 'multiformats/cid'
import * as Digest from 'multiformats/hashes/digest'
import { CarHeader as headerValidator } from './car-header-validator.js'

/**
 * @typedef {import('@ipld/car/api').Block} Block
 * @typedef {import('./car-types').CarReader} CarReaderIface
 * @typedef {import('@ipld/car/coding').BytesReader} BytesReader
 * @typedef {import('@ipld/car/coding').CarHeader} CarHeader
 * @typedef {import('@ipld/car/coding').CarV2Header} CarV2Header
 */

const CIDV0_BYTES = {
  SHA2_256: 0x12,
  LENGTH: 0x20,
  DAG_PB: 0x70,
}

const V2_HEADER_LENGTH =
  /* characteristics */ 16 /* v1 offset */ +
  8 /* v1 size */ +
  8 /* index offset */ +
  8

/**
 * Creates a `BytesReader` from a `Uint8Array`.
 *
 * @name decoder.bytesReader(bytes)
 * @param {Uint8Array} bytes
 * @returns {import('./car-types').BytesReader}
 */
export function bytesReader(bytes) {
  let pos = 0

  /** @type {import('./car-types').BytesReader} */
  return {
    upTo(length) {
      return bytes.subarray(pos, pos + Math.min(length, bytes.length - pos))
      /* c8 ignore next 2 */
      // Node.js 12 c8 bug
    },

    exactly(length) {
      if (length > bytes.length - pos) {
        throw new Error('Unexpected end of data')
      }
      return bytes.subarray(pos, pos + length)
      /* c8 ignore next 2 */
      // Node.js 12 c8 bug
    },

    seek(length) {
      pos += length
    },

    get pos() {
      return pos
    },
  }
}

/**
 * @param {import('./car-types').BytesReader} reader
 * @returns {number}
 */
function readVarint(reader) {
  const bytes = reader.upTo(8)
  if (bytes.length === 0) {
    throw new Error('Unexpected end of data')
  }
  const i = varint.decode(bytes)
  reader.seek(/** @type {number} */ (varint.decode.bytes))
  return i
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * @param {import('./car-types').BytesReader} reader
 * @returns {Uint8Array}
 */
function readMultihash(reader) {
  // | code | length | .... |
  // where both code and length are varints, so we have to decode
  // them first before we can know total length

  const bytes = reader.upTo(8)
  varint.decode(bytes) // code
  const codeLength = /** @type {number} */ (varint.decode.bytes)
  const length = varint.decode(bytes.subarray(varint.decode.bytes))
  const lengthLength = /** @type {number} */ (varint.decode.bytes)
  const mhLength = codeLength + lengthLength + length
  const multihash = reader.exactly(mhLength)
  reader.seek(mhLength)
  return multihash
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * @param {import('./car-types').BytesReader} reader
 * @returns {import('multiformats/cid').CID}
 */
function readCid(reader) {
  const first = reader.exactly(2)
  if (first[0] === CIDV0_BYTES.SHA2_256 && first[1] === CIDV0_BYTES.LENGTH) {
    // cidv0 32-byte sha2-256
    const bytes = reader.exactly(34)
    reader.seek(34)
    const multihash = Digest.decode(bytes)
    return CID.create(0, CIDV0_BYTES.DAG_PB, multihash)
  }

  const version = readVarint(reader)
  if (version !== 1) {
    throw new Error(`Unexpected CID version (${version})`)
  }
  const codec = readVarint(reader)
  const bytes = readMultihash(reader)
  const multihash = Digest.decode(bytes)
  return CID.create(version, codec, multihash)
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * Reads the leading data of an individual block from CAR data from a
 * `BytesReader`. Returns a `BlockHeader` object which contains
 * `{ cid, length, blockLength }` which can be used to either index the block
 * or read the block binary data.
 *
 * @name async decoder.readBlockHead(reader)
 * @param {import('./car-types').BytesReader} reader
 * @returns {import('@ipld/car/api').BlockHeader}
 */
export function readBlockHead(reader) {
  // length includes a CID + Binary, where CID has a variable length
  // we have to deal with
  const start = reader.pos
  let length = readVarint(reader)
  if (length === 0) {
    throw new Error('Invalid CAR section (zero length)')
  }
  length += reader.pos - start
  const cid = readCid(reader)
  const blockLength = length - Number(reader.pos - start) // subtract CID length

  return { cid, length, blockLength }
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * @param {import('./car-types').BytesReader} reader
 * @returns {import('@ipld/car/api').Block}
 */
function readBlock(reader) {
  const { cid, blockLength } = readBlockHead(reader)
  const bytes = reader.exactly(blockLength)
  reader.seek(blockLength)
  return { bytes, cid }
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * @param {import('./car-types').BytesReader} reader
 * @returns {import('@ipld/car/coding').CarV2FixedHeader}
 */
function readV2Header(reader) {
  /** @type {Uint8Array} */
  const bytes = reader.exactly(V2_HEADER_LENGTH)
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 0
  const header = {
    version: 2,
    /** @type {[bigint, bigint]} */
    characteristics: [
      dv.getBigUint64(offset, true),
      dv.getBigUint64((offset += 8), true),
    ],
    dataOffset: Number(dv.getBigUint64((offset += 8), true)),
    dataSize: Number(dv.getBigUint64((offset += 8), true)),
    indexOffset: Number(dv.getBigUint64((offset += 8), true)),
  }
  reader.seek(V2_HEADER_LENGTH)
  return header
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * Reads header data from a `BytesReader`. The header may either be in the form
 * of a `CarHeader` or `CarV2Header` depending on the CAR being read.
 *
 * @name async decoder.readHeader(reader)
 * @param {import('./car-types').BytesReader} reader
 * @param {number} [strictVersion]
 * @returns {import('@ipld/car/coding').CarHeader | import('@ipld/car/coding').CarV2Header}
 */
export function readHeader(reader, strictVersion) {
  const length = readVarint(reader)
  if (length === 0) {
    throw new Error('Invalid CAR header (zero length)')
  }
  const header = reader.exactly(length)
  reader.seek(length)
  const block = decodeDagCbor(header)
  if (!headerValidator(block)) {
    throw new Error('Invalid CAR header format')
  }
  if (
    (block.version !== 1 && block.version !== 2) ||
    (strictVersion !== undefined && block.version !== strictVersion)
  ) {
    throw new Error(
      `Invalid CAR version: ${block.version}${
        strictVersion !== undefined ? ` (expected ${strictVersion})` : ''
      }`
    )
  }
  // we've made 'roots' optional in the schema so we can do the version check
  // before rejecting the block as invalid if there is no version
  const hasRoots = Array.isArray(block.roots)
  if ((block.version === 1 && !hasRoots) || (block.version === 2 && hasRoots)) {
    throw new Error('Invalid CAR header format')
  }
  if (block.version === 1) {
    return block
  }
  // version 2
  const v2Header = readV2Header(reader)
  reader.seek(v2Header.dataOffset - reader.pos)
  const v1Header = readHeader(reader, 1)
  return Object.assign(v1Header, v2Header)
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * Creates a `CarDecoder` from a `BytesReader`. The `CarDecoder` is as async
 * interface that will consume the bytes from the `BytesReader` to yield a
 * `header()` and either `blocks()` or `blocksIndex()` data.
 *
 * @name decoder.createDecoder(reader)
 * @param {import('./car-types').BytesReader} reader
 * @returns {import('./car-types').CarDecoder}
 */
export function createDecoder(reader) {
  const header = readHeader(reader)
  if (header.version === 2) {
    const v1length = reader.pos - header.dataOffset
    reader = limitReader(reader, header.dataSize - v1length)
  }

  return {
    header: () => header,

    *blocks() {
      while (reader.upTo(8).length > 0) {
        yield readBlock(reader)
      }
    },

    *blocksIndex() {
      while (reader.upTo(8).length > 0) {
        yield readBlockIndex(reader)
      }
    },
  }
}

/**
 * @param {import('./car-types').BytesReader} reader
 * @returns {import('@ipld/car/api').BlockIndex}
 */
function readBlockIndex(reader) {
  const offset = reader.pos
  const { cid, length, blockLength } = readBlockHead(reader)
  const index = { cid, length, blockLength, offset, blockOffset: reader.pos }
  reader.seek(index.blockLength)
  return index
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * Wraps a `BytesReader` in a limiting `BytesReader` which limits maximum read
 * to `byteLimit` bytes. It _does not_ update `pos` of the original
 * `BytesReader`.
 *
 * @name decoder.limitReader(reader, byteLimit)
 * @param {import('./car-types').BytesReader} reader
 * @param {number} byteLimit
 * @returns {import('./car-types').BytesReader}
 */
export function limitReader(reader, byteLimit) {
  let bytesRead = 0

  /** @type {import('./car-types').BytesReader} */
  return {
    upTo(length) {
      let bytes = reader.upTo(length)
      if (bytes.length + bytesRead > byteLimit) {
        bytes = bytes.subarray(0, byteLimit - bytesRead)
      }
      return bytes
      /* c8 ignore next 2 */
      // Node.js 12 c8 bug
    },

    exactly(length) {
      const bytes = reader.exactly(length)
      if (bytes.length + bytesRead > byteLimit) {
        throw new Error('Unexpected end of data')
      }
      return bytes
      /* c8 ignore next 2 */
      // Node.js 12 c8 bug
    },

    seek(length) {
      bytesRead += length
      reader.seek(length)
    },

    get pos() {
      return reader.pos
    },
  }
}

/**
 * @private
 * @param {import('./car-types').BytesReader} reader
 * @returns {CarReaderIface}
 */
export function decodeReaderComplete(reader) {
  const decoder = createDecoder(reader)
  const header = decoder.header()
  const blocks = []
  for (const block of decoder.blocks()) {
    blocks.push(block)
  }

  return new CarReader(header, blocks)
  /* c8 ignore next 2 */
  // Node.js 12 c8 bug
}

/**
 * Provides blockstore-like access to a CAR.
 *
 * Implements the `RootsReader` interface:
 * {@link CarReader.getRoots `getRoots()`}. And the `BlockReader` interface:
 * {@link CarReader.get `get()`}, {@link CarReader.has `has()`},
 * {@link CarReader.blocks `blocks()`} (defined as a `BlockIterator`) and
 * {@link CarReader.cids `cids()`} (defined as a `CIDIterator`).
 *
 * Load this class with either `import { CarReader } from '@ipld/car/reader'`
 * (`const { CarReader } = require('@ipld/car/reader')`). Or
 * `import { CarReader } from '@ipld/car'` (`const { CarReader } = require('@ipld/car')`).
 * The former will likely result in smaller bundle sizes where this is
 * important.
 *
 * @name CarReader
 * @class
 * @implements {CarReaderIface}
 * @property {number} version The version number of the CAR referenced by this
 * reader (should be `1` or `2`).
 */
export class CarReader {
  /**
   * @constructs CarReader
   * @param {CarHeader|CarV2Header} header
   * @param {Block[]} blocks
   */
  constructor(header, blocks) {
    this._header = header
    this._blocks = blocks
    this._keys = blocks.map((b) => b.cid.toString())
  }

  /**
   * @property
   * @memberof CarReader
   * @instance
   */
  get version() {
    return this._header.version
  }

  /**
   * Get the list of roots defined by the CAR referenced by this reader. May be
   * zero or more `CID`s.
   *
   * @function
   * @memberof CarReader
   * @instance
   * @async
   * @returns {CID[]}
   */
  getRoots() {
    return this._header.roots
    /* c8 ignore next 2 */
    // Node.js 12 c8 bug
  }

  /**
   * Check whether a given `CID` exists within the CAR referenced by this
   * reader.
   *
   * @function
   * @memberof CarReader
   * @instance
   * @async
   * @param {CID} key
   * @returns {boolean}
   */
  has(key) {
    // eslint-disable-next-line unicorn/prefer-includes
    return this._keys.indexOf(key.toString()) > -1
    /* c8 ignore next 2 */
    // Node.js 12 c8 bug
  }

  /**
   * Fetch a `Block` (a `{ cid:CID, bytes:Uint8Array }` pair) from the CAR
   * referenced by this reader matching the provided `CID`. In the case where
   * the provided `CID` doesn't exist within the CAR, `undefined` will be
   * returned.
   *
   * @function
   * @memberof CarReader
   * @instance
   * @async
   * @param {CID} key
   * @returns {Block | undefined}
   */
  get(key) {
    const index = this._keys.indexOf(key.toString())
    return index > -1 ? this._blocks[index] : undefined
    /* c8 ignore next 2 */
    // Node.js 12 c8 bug
  }

  /**
   * Returns a `BlockIterator` (`AsyncIterable<Block>`) that iterates over all
   * of the `Block`s (`{ cid:CID, bytes:Uint8Array }` pairs) contained within
   * the CAR referenced by this reader.
   *
   * @function
   * @memberof CarReader
   * @instance
   * @async
   * @generator
   * @returns {Generator<Block>}
   */
  *blocks() {
    for (const block of this._blocks) {
      yield block
    }
  }

  /**
   * Returns a `CIDIterator` (`AsyncIterable<CID>`) that iterates over all of
   * the `CID`s contained within the CAR referenced by this reader.
   *
   * @function
   * @memberof CarReader
   * @instance
   * @async
   * @generator
   * @returns {Generator<CID>}
   */
  *cids() {
    for (const block of this._blocks) {
      yield block.cid
    }
  }

  /**
   * Instantiate a {@link CarReader} from a `Uint8Array` blob. This performs a
   * decode fully in memory and maintains the decoded state in memory for full
   * access to the data via the `CarReader` API.
   *
   * @async
   * @static
   * @memberof CarReader
   * @param {Uint8Array} bytes
   * @returns {CarReaderIface} blip blop
   */
  static fromBytes(bytes) {
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError('fromBytes() requires a Uint8Array')
    }
    return decodeReaderComplete(bytesReader(bytes))
    /* c8 ignore next 2 */
    // Node.js 12 c8 bug
  }
}
