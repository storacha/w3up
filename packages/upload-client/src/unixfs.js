import * as UnixFS from '@ipld/unixfs'
import * as raw from 'multiformats/codecs/raw'
import { withMaxChunkSize } from '@ipld/unixfs/file/chunker/fixed'
import { withWidth } from '@ipld/unixfs/file/layout/balanced'

const SHARD_THRESHOLD = 1000 // shard directory after > 1,000 items
const queuingStrategy = UnixFS.withCapacity()

const defaultSettings = UnixFS.configure({
  fileChunkEncoder: raw,
  smallFileEncoder: raw,
  chunker: withMaxChunkSize(1024 * 1024),
  fileLayout: withWidth(1024),
})

/**
 * @param {import('./types.js').BlobLike} blob
 * @param {import('./types.js').UnixFSEncoderSettingsOptions} [options]
 * @returns {Promise<import('./types.js').UnixFSEncodeResult>}
 */
export async function encodeFile(blob, options) {
  const readable = createFileEncoderStream(blob, options)
  const blocks = await collect(readable)
  // @ts-expect-error There is always a root block
  return { cid: blocks.at(-1).cid, blocks }
}

/**
 * @param {import('./types.js').BlobLike} blob
 * @param {import('./types.js').UnixFSEncoderSettingsOptions} [options]
 * @returns {ReadableStream<import('@ipld/unixfs').Block>}
 */
export function createFileEncoderStream(blob, options) {
  /** @type {TransformStream<import('@ipld/unixfs').Block, import('@ipld/unixfs').Block>} */
  const { readable, writable } = new TransformStream({}, queuingStrategy)
  const settings = options?.settings ?? defaultSettings
  const unixfsWriter = UnixFS.createWriter({ writable, settings })
  const fileBuilder = new UnixFSFileBuilder('', blob)
  void (async () => {
    await fileBuilder.finalize(unixfsWriter)
    await unixfsWriter.close()
  })()
  return readable
}

class UnixFSFileBuilder {
  #file

  /**
   * @param {string} name
   * @param {import('./types.js').BlobLike} file
   */
  constructor(name, file) {
    this.name = name
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
  #options

  /** @type {Map<string, UnixFSFileBuilder | UnixFSDirectoryBuilder>} */
  entries = new Map()

  /**
   * @param {string} name
   * @param {import('./types.js').UnixFSDirectoryEncoderOptions} [options]
   */
  constructor(name, options) {
    this.name = name
    this.#options = options
  }

  /** @param {import('@ipld/unixfs').View} writer */
  async finalize(writer) {
    // Map to store links for each path
    const linksByPath = new Map()

    // Store directory builders by path for later lookups
    const dirBuildersByPath = new Map()
    dirBuildersByPath.set('', this)

    // Process all directories first (discovery phase)
    // This collects all directories without processing them
    const discoverDirectories = (
      /**@type {UnixFSDirectoryBuilder}*/ dir,
      path = ''
    ) => {
      for (const [name, entry] of dir.entries) {
        const entryPath = path ? `${path}/${name}` : name

        if (entry instanceof UnixFSDirectoryBuilder) {
          dirBuildersByPath.set(entryPath, entry)
          discoverDirectories(entry, entryPath)
        }
      }
    }

    // Start discovery from root
    discoverDirectories(this)

    // Collect all files that need processing
    const files = []
    for (const [dirPath, dir] of dirBuildersByPath) {
      for (const [name, entry] of dir.entries) {
        if (entry instanceof UnixFSFileBuilder) {
          const entryPath = dirPath ? `${dirPath}/${name}` : name
          files.push({ entry, entryPath })
        }
      }
    }

    // Process files in larger batches for better performance
    const BATCH_SIZE = 10000
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE)

      // Process batch in parallel
      await Promise.all(
        batch.map(async ({ entry, entryPath }) => {
          const link = await entry.finalize(writer)
          linksByPath.set(entryPath, link)

          if (this.#options?.onDirectoryEntryLink) {
            // @ts-expect-error Type mismatch between link interfaces
            this.#options.onDirectoryEntryLink({ name: entry.name, ...link })
          }
        })
      )
    }

    // Process directories from deepest to shallowest
    // Use a more efficient sort by calculating depth during map
    const sortedDirs = Array.from(dirBuildersByPath.entries())
      .map(([path, dir]) => ({
        path,
        dir,
        depth: path ? path.split('/').length : 0,
      }))
      .sort((a, b) => b.depth - a.depth) // Sort by depth (deepest first)

    // Skip the root directory as it will be processed at the end
    for (const { path, dir } of sortedDirs.filter(({ path }) => path !== '')) {
      const dirWriter =
        dir.entries.size <= SHARD_THRESHOLD
          ? UnixFS.createDirectoryWriter(writer)
          : UnixFS.createShardedDirectoryWriter(writer)

      // Add all entries from this directory
      for (const [name, _] of dir.entries) {
        const entryPath = path ? `${path}/${name}` : name
        const link = linksByPath.get(entryPath)

        if (link) {
          dirWriter.set(name, link)
        }
      }

      // Finalize directory
      const link = await dirWriter.close()
      linksByPath.set(path, link)

      if (this.#options?.onDirectoryEntryLink) {
        /* c8 ignore next */
        this.#options.onDirectoryEntryLink({ name: dir.name, ...link })
      }
    }

    // Finally, process the root directory
    const rootDirWriter =
      this.entries.size <= SHARD_THRESHOLD
        ? UnixFS.createDirectoryWriter(writer)
        : UnixFS.createShardedDirectoryWriter(writer)

    for (const [name, _] of this.entries) {
      const link = linksByPath.get(name)
      if (link) {
        rootDirWriter.set(name, link)
      }
    }

    return await rootDirWriter.close()
  }
}

/**
 * @param {Iterable<import('./types.js').FileLike>} files
 * @param {import('./types.js').UnixFSEncoderSettingsOptions & import('./types.js').UnixFSDirectoryEncoderOptions} [options]
 * @returns {Promise<import('./types.js').UnixFSEncodeResult>}
 */
export async function encodeDirectory(files, options) {
  const readable = createDirectoryEncoderStream(files, options)
  const blocks = await collect(readable)
  // @ts-expect-error There is always a root block
  return { cid: blocks.at(-1).cid, blocks }
}

/**
 * @param {Iterable<import('./types.js').FileLike>} files
 * @param {import('./types.js').UnixFSEncoderSettingsOptions & import('./types.js').UnixFSDirectoryEncoderOptions} [options]
 * @returns {ReadableStream<import('@ipld/unixfs').Block>}
 */
export function createDirectoryEncoderStream(files, options) {
  const rootDir = new UnixFSDirectoryBuilder('', options)

  for (const file of files) {
    const path = file.name.split('/')
    if (path[0] === '' || path[0] === '.') {
      path.shift()
    }
    let dir = rootDir
    for (const [i, name] of path.entries()) {
      if (i === path.length - 1) {
        dir.entries.set(name, new UnixFSFileBuilder(path.join('/'), file))
        break
      }
      let dirBuilder = dir.entries.get(name)
      if (dirBuilder == null) {
        const dirName = dir === rootDir ? name : `${dir.name}/${name}`
        dirBuilder = new UnixFSDirectoryBuilder(dirName, options)
        dir.entries.set(name, dirBuilder)
      }
      if (!(dirBuilder instanceof UnixFSDirectoryBuilder)) {
        throw new Error(`"${file.name}" cannot be a file and a directory`)
      }
      dir = dirBuilder
    }
  }

  /** @type {TransformStream<import('@ipld/unixfs').Block, import('@ipld/unixfs').Block>} */
  const { readable, writable } = new TransformStream({}, queuingStrategy)
  const settings = options?.settings ?? defaultSettings
  const unixfsWriter = UnixFS.createWriter({ writable, settings })
  void (async () => {
    const link = await rootDir.finalize(unixfsWriter)
    if (options?.onDirectoryEntryLink) {
      options.onDirectoryEntryLink({ name: '', ...link })
    }
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
