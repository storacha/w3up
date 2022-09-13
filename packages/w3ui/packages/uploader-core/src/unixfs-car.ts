import * as UnixFS from '@ipld/unixfs'
import type { Block } from '@ipld/unixfs'
import type { CID } from 'multiformats/cid'
import { CarWriter } from '@ipld/car'
import { toIterable } from './streams'

const queuingStrategy = UnixFS.withCapacity(1048576 * 175)

export interface EncodeResult {
  root: CID
  car: AsyncIterable<Uint8Array>
}

export async function encodeFile (blob: Blob): Promise<EncodeResult> {
  const { readable, writable } = new TransformStream<Block, Block>({}, queuingStrategy)
  const unixfsWriter = UnixFS.createWriter({ writable })

  const unixfsFileWriter = UnixFS.createFileWriter(unixfsWriter)
  await unixfsFileWriter.write(new Uint8Array(await blob.arrayBuffer()))

  const { cid } = await unixfsFileWriter.close()

  // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
  const { writer: carBlockWriter, out } = CarWriter.create(cid)

  let error: Error

  void (async () => {
    try {
      await unixfsWriter.close()
    } catch (err) {
      // @ts-expect-error
      error = new Error('failed to close UnixFS writer stream', { cause: err })
    }
  })()

  void (async () => {
    try {
      for await (const block of toIterable(readable)) {
        // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
        await carBlockWriter.put(block)
      }
    } catch (err: any) {
      error = err
    } finally {
      try {
        await carBlockWriter.close()
      } catch (err: any) {
        error = err
      }
    }
  })()

  return {
    // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
    root: cid,
    car: (async function * () {
      yield * out
      // @ts-expect-error Variable 'error' is used before being assigned.
      if (error != null) throw error
    })()
  }
}

class TreeFile {
  #file: File
  #writer: UnixFS.View

  constructor (file: File, writer: UnixFS.View) {
    this.#file = file
    this.#writer = writer
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async finalize () {
    const unixfsFileWriter = UnixFS.createFileWriter(this.#writer)
    await unixfsFileWriter.write(new Uint8Array(await this.#file.arrayBuffer()))
    return await unixfsFileWriter.close()
  }
}

class TreeDirectory {
  entries: Map<string, TreeFile | TreeDirectory>
  #writer: UnixFS.View

  constructor (writer: UnixFS.View) {
    this.#writer = writer
    this.entries = new Map()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async finalize () {
    const dirWriter = UnixFS.createDirectoryWriter(this.#writer)
    for (const [name, entry] of this.entries) {
      const link = await entry.finalize()
      dirWriter.set(name, link)
    }
    return await dirWriter.close()
  }
}

export async function encodeDirectory (files: Iterable<File>): Promise<EncodeResult> {
  const { readable, writable } = new TransformStream<Block, Block>({}, queuingStrategy)
  const unixfsWriter = UnixFS.createWriter({ writable })

  const root = new TreeDirectory(unixfsWriter)

  for (const file of files) {
    const path = file.name.split('/')
    if (path[0] === '' || path[0] === '.') {
      path.shift()
    }
    let dir = root
    for (const [i, name] of path.entries()) {
      if (i === path.length - 1) {
        dir.entries.set(name, new TreeFile(file, unixfsWriter))
        break
      }
      let treeDir = dir.entries.get(name)
      if (treeDir == null) {
        treeDir = new TreeDirectory(unixfsWriter)
        dir.entries.set(name, treeDir)
      }
      if (!(treeDir instanceof TreeDirectory)) {
        throw new Error(`"${name}" cannot be a file and a directory`)
      }
      dir = treeDir
    }
  }

  const { cid } = await root.finalize()

  // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
  const { writer: carBlockWriter, out } = CarWriter.create(cid)

  let error: Error

  void (async () => {
    try {
      await unixfsWriter.close()
    } catch (err) {
      // @ts-expect-error
      error = new Error('failed to close UnixFS writer stream', { cause: err })
    }
  })()

  void (async () => {
    try {
      for await (const block of toIterable(readable)) {
        // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
        await carBlockWriter.put(block)
      }
    } catch (err: any) {
      error = err
    } finally {
      try {
        await carBlockWriter.close()
      } catch (err: any) {
        error = err
      }
    }
  })()

  return {
    // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
    root: cid,
    car: (async function * () {
      yield * out
      // @ts-expect-error Variable 'error' is used before being assigned.
      if (error != null) throw error
    })()
  }
}
