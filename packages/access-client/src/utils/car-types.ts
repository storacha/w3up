import { Block, BlockIndex, CID } from '@ipld/car/api'
import { CarHeader, CarV2Header } from '@ipld/car/coding'

export interface BytesReader {
  upTo: (length: number) => Uint8Array

  exactly: (length: number) => Uint8Array

  seek: (length: number) => void

  pos: number
}

export interface CarDecoder {
  header: () => CarHeader | CarV2Header

  blocks: () => Generator<Block>

  blocksIndex: () => Generator<BlockIndex>
}

export interface BlockIterator extends Generator<Block> {}

export interface CIDIterator extends Generator<CID> {}

export interface BlockReader {
  has: (key: CID) => boolean
  get: (key: CID) => Block | undefined
  blocks: () => BlockIterator
  cids: () => CIDIterator
}

export interface RootsReader {
  version: number
  getRoots: () => CID[]
}
export interface CarReader extends BlockReader, RootsReader {}
