import * as UnixFS from '@ipld/unixfs'
import * as raw from 'multiformats/codecs/raw'

const queuingStrategy = UnixFS.withCapacity()

// TODO: configure chunk size and max children https://github.com/ipld/js-unixfs/issues/36
const settings = UnixFS.configure({
  fileChunkEncoder: raw,
  smallFileEncoder: raw,
})

/**
 * @param {import('./types').BlobLike} blob
 * @returns {Promise<import('./types').UnixFSEncodeResult>}
 */
export async function encodeFile(blob) {
  const readable = createFileEncoderStream(blob)
  const blocks = await collect(readable)
  // @ts-expect-error There is always a root block
  return { cid: blocks.at(-1).cid, blocks }
}

/**
 * @param {import('./types').BlobLike} blob
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
    await this.#file.stream().pipeTo(
      new WritableStream({
        async write(chunk) {
          await unixfsFileWriter.write(chunk)
        },
      })
    )
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
  const blocks = await collect(readable)
  // @ts-expect-error There is always a root block
  return { cid: blocks.at(-1).cid, blocks }
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

/**
 * @template T
 * @param {ReadableStream<T>} collectable
 * @returns {Promise<T[]>}
 */
async function collect(collectable) {
  /** @type {T[]} */
  const chunks = []
  await collectable.pipeTo(
    new WritableStream({
      write(chunk) {
        chunks.push(chunk)
      },
    })
  )
  return chunks
}
