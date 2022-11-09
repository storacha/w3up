import * as UnixFS from '@ipld/unixfs'
import * as raw from 'multiformats/codecs/raw'
import { toIterable, collect } from './utils.js'

const queuingStrategy = UnixFS.withCapacity(1_048_576 * 175)

// TODO: configure chunk size and max children https://github.com/ipld/js-unixfs/issues/36
const settings = UnixFS.configure({
  fileChunkEncoder: raw,
  smallFileEncoder: raw,
})

/**
 * @param {Blob} blob
 * @returns {Promise<import('./types').UnixFSEncodeResult>}
 */
export async function encodeFile(blob) {
  const readable = createFileEncoderStream(blob)
  const blocks = await collect(toIterable(readable))
  const rootBlock = blocks.at(-1)
  if (rootBlock == null) throw new Error('missing root block')
  return { cid: rootBlock.cid, blocks }
}

/**
 * @param {Blob} blob
 * @returns {ReadableStream<import('@ipld/unixfs').Block>}
 */
export function createFileEncoderStream(blob) {
  /** @type {TransformStream<import('@ipld/unixfs').Block, import('@ipld/unixfs').Block>} */
  const { readable, writable } = new TransformStream({}, queuingStrategy)
  const unixfsWriter = UnixFS.createWriter({ writable, settings })
  const fileBuilder = new UnixFsFileBuilder(blob)
  void (async () => {
    await fileBuilder.finalize(unixfsWriter)
    await unixfsWriter.close()
  })()
  return readable
}

class UnixFsFileBuilder {
  #file

  /** @param {{ stream: () => ReadableStream }} file */
  constructor(file) {
    this.#file = file
  }

  /** @param {import('@ipld/unixfs').View} writer */
  async finalize(writer) {
    const unixfsFileWriter = UnixFS.createFileWriter(writer)
    const stream = toIterable(this.#file.stream())
    for await (const chunk of stream) {
      await unixfsFileWriter.write(chunk)
    }
    return await unixfsFileWriter.close()
  }
}

class UnixFSDirectoryBuilder {
  /** @type {Map<string, UnixFsFileBuilder | UnixFSDirectoryBuilder>} */
  entries = new Map()

  /** @param {import('@ipld/unixfs').View} writer */
  async finalize(writer) {
    const dirWriter = UnixFS.createDirectoryWriter(writer)
    for (const [name, entry] of this.entries) {
      const link = await entry.finalize(writer)
      dirWriter.set(name, link)
    }
    return await dirWriter.close()
  }
}

/**
 * @param {Iterable<import('./types').FileLike>} files
 * @returns {Promise<import('./types').UnixFSEncodeResult>}
 */
export async function encodeDirectory(files) {
  const readable = createDirectoryEncoderStream(files)
  const blocks = await collect(toIterable(readable))
  const rootBlock = blocks.at(-1)
  if (rootBlock == null) throw new Error('missing root block')
  return { cid: rootBlock.cid, blocks }
}

/**
 * @param {Iterable<import('./types').FileLike>} files
 * @returns {ReadableStream<import('@ipld/unixfs').Block>}
 */
export function createDirectoryEncoderStream(files) {
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

  /** @type {TransformStream<import('@ipld/unixfs').Block, import('@ipld/unixfs').Block>} */
  const { readable, writable } = new TransformStream({}, queuingStrategy)
  const unixfsWriter = UnixFS.createWriter({ writable, settings })
  void (async () => {
    await rootDir.finalize(unixfsWriter)
    await unixfsWriter.close()
  })()

  return readable
}
