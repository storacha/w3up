import * as UnixFS from '@ipld/unixfs'
import type { Block } from '@ipld/unixfs'
import type { CID } from 'multiformats/cid'
import { CarWriter } from '@ipld/car'
import { toIterable } from './streams'

const queuingStrategy = UnixFS.withCapacity(1048576 * 175)

export interface EncodeResult {
  cid: CID
  car: AsyncIterable<Uint8Array>
}

export async function encodeFile (blob: Blob): Promise<EncodeResult> {
  const { readable, writable } = new TransformStream<Block, Block>({}, queuingStrategy)
  const unixfsWriter = UnixFS.createWriter({ writable })

  const unixfsFileWriter = UnixFS.createFileWriter(unixfsWriter)
  const stream = toIterable<Uint8Array>(blob.stream())
  for await (const chunk of stream) {
    await unixfsFileWriter.write(chunk)
  }

  const { cid } = await unixfsFileWriter.close()

  unixfsWriter.close().catch(err => console.error('failed to close UnixFS writer stream', err))

  // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
  return { cid, car: createCar(cid, toIterable(readable)) }
}

class UnixFsFileBuilder {
  #file: File

  constructor (file: File) {
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

export async function encodeDirectory (files: Iterable<File>): Promise<EncodeResult> {
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
  const { cid } = await rootDir.finalize(unixfsWriter)

  unixfsWriter.close().catch(err => console.error('failed to close UnixFS writer stream', err))

  // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
  return { cid, car: createCar(cid, toIterable(readable)) }
}

function createCar (rootCid: CID, blocks: AsyncIterable<UnixFS.Block>): AsyncIterable<Uint8Array> {
  const { writer, out } = CarWriter.create(rootCid)

  let error: Error
  void (async () => {
    try {
      for await (const block of blocks) {
        // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
        await writer.put(block)
      }
    } catch (err: any) {
      error = err
    } finally {
      try {
        await writer.close()
      } catch (err: any) {
        error = err
      }
    }
  })()

  return (async function * () {
    yield * out
    // @ts-expect-error Variable 'error' is used before being assigned.
    if (error != null) throw error
  })()
}
