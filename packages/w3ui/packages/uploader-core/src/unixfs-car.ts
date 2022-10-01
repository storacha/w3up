import * as UnixFS from '@ipld/unixfs'
import type { Block } from '@ipld/unixfs'
import type { CID } from 'multiformats/cid'
import { toIterable } from './streams'

const queuingStrategy = UnixFS.withCapacity(1048576 * 175)

export interface EncodeResult {
  /**
   * Root CID for the DAG, resolves when the DAG has been fully built (the
   * blocks stream consumed).
   */
  cid: Promise<CID>
  /**
   * Blocks for the generated DAG.
   */
  blocks: ReadableStream<UnixFS.Block>
}

export function encodeFile (blob: Blob): EncodeResult {
  const { readable, writable } = new TransformStream<Block, Block>({}, queuingStrategy)
  const unixfsWriter = UnixFS.createWriter({ writable })
  const fileBuilder = new UnixFsFileBuilder(blob)
  const cidPromise = (async () => {
    const { cid } = await fileBuilder.finalize(unixfsWriter)
    await unixfsWriter.close()
    return cid
  })()

  // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
  return { cid: cidPromise, blocks: readable }
}

class UnixFsFileBuilder {
  #file: Blob

  constructor (file: Blob) {
    this.#file = file
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async finalize (writer: UnixFS.View) {
    const unixfsFileWriter = UnixFS.createFileWriter(writer)
    const stream = toIterable<Uint8Array>(this.#file.stream())
    for await (const chunk of stream) {
      await unixfsFileWriter.write(chunk)
    }
    return await unixfsFileWriter.close()
  }
}

class UnixFSDirectoryBuilder {
  entries: Map<string, UnixFsFileBuilder | UnixFSDirectoryBuilder> = new Map()

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async finalize (writer: UnixFS.View) {
    const dirWriter = UnixFS.createDirectoryWriter(writer)
    for (const [name, entry] of this.entries) {
      const link = await entry.finalize(writer)
      dirWriter.set(name, link)
    }
    return await dirWriter.close()
  }
}

export function encodeDirectory (files: Iterable<File>): EncodeResult {
  const rootDir = new UnixFSDirectoryBuilder()

  for (const file of files) {
    const path = file.name.split('/')
    if (path[0] === '' || path[0] === '.') {
      path.shift()
    }
    let dir = rootDir
    for (const [i, name] of path.entries()) {
      if (i === path.length - 1) {
        dir.entries.set(name, new UnixFsFileBuilder(file))
        break
      }
      let dirBuilder = dir.entries.get(name)
      if (dirBuilder == null) {
        dirBuilder = new UnixFSDirectoryBuilder()
        dir.entries.set(name, dirBuilder)
      }
      if (!(dirBuilder instanceof UnixFSDirectoryBuilder)) {
        throw new Error(`"${name}" cannot be a file and a directory`)
      }
      dir = dirBuilder
    }
  }

  const { readable, writable } = new TransformStream<Block, Block>({}, queuingStrategy)
  const unixfsWriter = UnixFS.createWriter({ writable })
  const cidPromise = (async () => {
    const { cid } = await rootDir.finalize(unixfsWriter)
    await unixfsWriter.close()
    return cid
  })()

  // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
  return { cid: cidPromise, blocks: readable }
}
