import assert from 'assert'
import * as UnixFS from '@ipld/unixfs'
import { exporter } from 'ipfs-unixfs-exporter'
// @ts-expect-error this version of blockstore-core doesn't point to correct types file in package.json, and upgrading to latest version that fixes that leads to api changes
import { MemoryBlockstore } from 'blockstore-core/memory'
import * as raw from 'multiformats/codecs/raw'
import * as Link from 'multiformats/link'
import path from 'path'
import { encodeFile, encodeDirectory, SHARD_THRESHOLD } from '../src/unixfs.js'
import { File } from './helpers/shims.js'

/** @param {import('ipfs-unixfs-exporter').UnixFSDirectory} dir */
async function collectDir(dir) {
  /** @type {import('ipfs-unixfs-exporter').UnixFSEntry[]} */
  const entries = []
  for await (const entry of dir.content()) {
    if (entry.type === 'directory') {
      entries.push(...(await collectDir(entry)))
    } else {
      entries.push(entry)
    }
  }
  return entries
}

/** @param {Iterable<import('@ipld/unixfs').Block>} blocks */
async function blocksToBlockstore(blocks) {
  const blockstore = new MemoryBlockstore()
  for (const block of blocks) {
    await blockstore.put(block.cid, block.bytes)
  }
  return blockstore
}

describe('UnixFS', () => {
  it('encodes a file', async () => {
    const file = new Blob(['test'])
    const { cid, blocks } = await encodeFile(file)
    const blockstore = await blocksToBlockstore(blocks)
    const entry = await exporter(cid.toString(), blockstore)
    const chunks = []
    for await (const chunk of entry.content()) chunks.push(chunk)
    const out = new Blob(chunks)
    assert.equal(await out.text(), await file.text())
  })

  it('encodes a directory', async () => {
    const files = [
      new File(['top level'], 'aaaaa.txt'),
      new File(['top level dot prefix'], './bbb.txt'),
      new File(['top level slash prefix'], '/c.txt'),
      new File(['in a dir'], 'dir/two.txt'),
      new File(['another in a dir'], 'dir/three.txt'),
      new File(['in deeper in dir'], 'dir/deeper/four.png'),
      new File(['back in the parent'], 'dir/five.pdf'),
      new File(['another in the child'], 'dir/deeper/six.mp4'),
    ]

    const { cid, blocks } = await encodeDirectory(files)
    const blockstore = await blocksToBlockstore(blocks)
    const dirEntry = await exporter(cid.toString(), blockstore)
    assert.equal(dirEntry.type, 'directory')

    const expectedPaths = files.map((f) => path.join(cid.toString(), f.name))
    const entries = await collectDir(dirEntry)
    const actualPaths = entries.map((e) => e.path)

    expectedPaths.forEach((p) => assert(actualPaths.includes(p)))
  })

  it('encodes a sharded directory', async () => {
    // Create a directory with more than SHARD_THRESHOLD entries
    const files = []
    for (let i = 0; i < 1001; i++) {
      files.push(new File([`content ${i}`], `file-${i}.txt`))
    }

    const { cid, blocks } = await encodeDirectory(files)
    const blockstore = await blocksToBlockstore(blocks)
    const entry = await exporter(cid.toString(), blockstore)
    assert.equal(entry.type, 'directory')

    // Verify all files are present
    const entries = await collectDir(entry)
    assert.equal(entries.length, 1001)

    // Verify content
    for (let i = 0; i < 1001; i++) {
      const fileEntry = entries.find((e) => e.name === `file-${i}.txt`)
      assert.ok(fileEntry, `file-${i}.txt should exist`)
      const chunks = []
      for await (const chunk of fileEntry.content()) chunks.push(chunk)
      const content = new Blob(chunks)
      assert.equal(await content.text(), `content ${i}`)
    }
  })

  it('encodes a directory with exactly 1001 entries', async () => {
    // Create a directory with exactly 1001 entries (SHARD_THRESHOLD + 1)
    const files = []
    for (let i = 0; i < 1001; i++) {
      files.push(new File([`content ${i}`], `file-${i}.txt`))
    }

    // Track directory entry links to verify sharding
    const links = []
    const { cid, blocks } = await encodeDirectory(files, {
      onDirectoryEntryLink: (link) => links.push(link),
    })

    // Verify that we got a sharded directory by checking the number of blocks
    // A sharded directory should have more blocks than just the files + root
    assert.ok(
      blocks.length > 1002,
      'Should have extra blocks for sharding structure'
    )

    // Verify the directory structure
    const blockstore = await blocksToBlockstore(blocks)
    const entry = await exporter(cid.toString(), blockstore)
    assert.equal(entry.type, 'directory')

    // Verify all files are present
    const entries = await collectDir(entry)
    assert.equal(entries.length, 1001)

    // Verify content and order
    for (let i = 0; i < 1001; i++) {
      const fileEntry = entries.find((e) => e.name === `file-${i}.txt`)
      assert.ok(fileEntry, `file-${i}.txt should exist`)
      const chunks = []
      for await (const chunk of fileEntry.content()) chunks.push(chunk)
      const content = new Blob(chunks)
      assert.equal(await content.text(), `content ${i}`)
    }
  })

  it('encodes a directory with more entries than the shard threshold', async () => {
    const files = []
    for (let i = 0; i < SHARD_THRESHOLD + 1; i++) {
      files.push(new File([`content ${i}`], `file-${i}.txt`))
    }

    const { cid, blocks } = await encodeDirectory(files)
    const blockstore = await blocksToBlockstore(blocks)
    const entry = await exporter(cid.toString(), blockstore)
    assert.equal(entry.type, 'directory')

    // Verify all files are present
    const entries = await collectDir(entry)
    assert.equal(entries.length, 1001)

    // Verify content
    for (let i = 0; i < 1001; i++) {
      const fileEntry = entries.find((e) => e.name === `file-${i}.txt`)
      assert.ok(fileEntry, `file-${i}.txt should exist`)
      const chunks = []
      for await (const chunk of fileEntry.content()) chunks.push(chunk)
      const content = new Blob(chunks)
      assert.equal(await content.text(), `content ${i}`)
    }
  })

  it('throws then treating a file as a directory', () =>
    assert.rejects(
      encodeDirectory([
        new File(['a file, not a directory'], 'file.txt'),
        new File(['a file in a file!!!'], 'file.txt/another.txt'),
      ]),
      { message: '"file.txt/another.txt" cannot be a file and a directory' }
    ))

  it('configured to use raw leaves', async () => {
    const file = new Blob(['test'])
    const { cid } = await encodeFile(file)
    assert.equal(cid.code, raw.code)
  })

  it('configured to output v0 CIDs', async () => {
    const file = new Blob(['test'])
    const { cid } = await encodeFile(file, {
      settings: {
        ...UnixFS.defaults(),
        linker: {
          // @ts-expect-error
          createLink: (_, digest) => Link.createLegacy(digest),
        },
      },
    })
    assert.equal(cid.version, 0)
  })

  it('callback for each directory entry link', async () => {
    const files = [
      new File(['file'], 'file.txt'),
      new File(['another'], '/dir/another.txt'),
    ]
    /** @type {import('../src/types.js').DirectoryEntryLink[]} */
    const links = []
    await encodeDirectory(files, { onDirectoryEntryLink: (l) => links.push(l) })
    assert.equal(links.length, 4)
    assert.equal(links[0].name, 'file.txt')
    assert.equal(links[0].dagByteLength, 4)
    assert.equal(
      links[0].cid.toString(),
      'bafkreib3tq2y6nxqumnwvu7bj4yjy7hrtcwjerxigfxzzzkd2wyzvqblqa'
    )
    assert.equal(links[1].name, 'dir/another.txt')
    assert.equal(links[1].dagByteLength, 7)
    assert.equal(
      links[1].cid.toString(),
      'bafkreifoisfmq3corzg6yzcxffyi55ayooxhtrw77bhp64zwbgeuq7yi4u'
    )
    assert.equal(links[2].name, 'dir')
    assert.equal(links[2].dagByteLength, 66)
    assert.equal(
      links[2].cid.toString(),
      'bafybeigbv3g5frjg66akpd6gwfkryqraom4nyrgtltpyoa4e7h3bhnbmti'
    )
    assert.equal(links[3].name, '')
    assert.equal(links[3].dagByteLength, 173)
    assert.equal(
      links[3].cid.toString(),
      'bafybeie4fxkioskwb4h7xpb5f6tbktm4vjxt7rtsqjit72jrv3ii5h26sy'
    )
  })

  it('handles files with empty paths', async () => {
    const files = [
      new File(['content1'], 'file1'),
      new File(['content2'], './file2'),
      new File(['content3'], '/file3'),
      new File(['content4'], '.file4'),
      new File(['content5'], ''),
      new File(['content6'], '.'),
      new File(['content7'], './'),
    ]

    const { cid, blocks } = await encodeDirectory(files)
    const blockstore = await blocksToBlockstore(blocks)
    const entry = await exporter(cid.toString(), blockstore)
    assert.equal(entry.type, 'directory')

    // Verify that all files are present
    const entries = await collectDir(entry)
    assert.equal(
      entries.length,
      5,
      'Should have all files including empty path'
    )

    // Verify content and names
    const fileNames = entries.map((e) => e.name)
    assert(fileNames.includes('file1'), 'file1 should exist')
    assert(fileNames.includes('file2'), 'file2 should exist')
    assert(fileNames.includes('file3'), 'file3 should exist')
    assert(fileNames.includes('.file4'), '.file4 should exist')
    assert(fileNames.includes(''), 'empty path should exist')
  })

  /**
   * This test is skipped by default as it uses a lot of resources
   * Enable to verify that the iterative approach works in a directory with a large number of files
   */
  it.skip('handles a directory with a large number of files without stack overflow', async function () {
    // Set a longer timeout for this test
    this.timeout(1200_000) // 20 minutes

    // We're testing a flat directory with many files - no deep nesting
    const maxFiles = 200_000

    console.log(
      `Testing with ${maxFiles} UUID-named files in a flat directory...`
    )

    /**
     * Create a flat directory with many UUID-like named files
     * to simulate the real-world scenario from issue-1.md
     *
     * @returns {Array<File>} - Array of File objects
     */
    function createFlatDirectoryFiles() {
      console.log('Creating files with UUID-like names in flat directory...')
      const files = []

      // Sample content similar to the issue description
      const sampleContent = JSON.stringify([
        '0x4bc8ea729e10e076cb02e198f312cba859d2c202778fa200d9c4c9a3621714c2',
        '0xf5b44224220bcb535137516ed438f06a5e715229ca06d5135e36eb5560ab2b22',
        '0xb92080112acb7641f41a508f319eb402d35b81767e3f5453b658ce17a9a243fe',
        '0x5a6af28c138214f464455e46e7ad4be42be4fe1e332ba42777391c3542034d9a',
        '0x3b1f0f5a42c1d508d1ed62a874bb6c562ce389f88672f4d7a5101f45492d283b',
        '0xd4772789dacb58c295ef4b42dd77b6c2fa07b45d6569cbe2930b55694029a782',
        '0x0b72d029fb8f7ec6c9ca0abc9cd67c6c2def3b1655854b8663a42ab75daf08d2',
        '0x7ed79f6f3edc539d606814e7e730996ed177495e9e134192767dc9e1b8a0a323',
        '0x5255a6fae11f2135603802c696196bc37aa0e9d703d75f153650b4038ceae2c9',
        '0x1da65deffcc795b924125a339093c018b42f1103952f92823a96b2cc67a032bc',
        '0x75a8cf45d769c56911e41b3bdd5b1286a7c9f59cb3a2c944f405c3505ac910c5',
        '0xf05315b4e77a3026e1d8e8c9e61896cf436a510a62dadbe6f7f516b855ba5564',
        '0xe0b3f13831669076d52406d5c78de76c56bc94fb9a3074f7bb45e2b6ae50984b',
        '0x4d5cb35459db22b7f612225f0784ccc64dd4d87476d2c1c85ce365bb7a545faf',
        '0x381df64f88191da01e4e5a0151d1fef35034c93a6d9e68d1547258d95cac0fbe',
        Math.random().toString(36).substring(2, 15),
      ])

      for (let fileIdx = 0; fileIdx < maxFiles; fileIdx++) {
        // Generate a UUID-like filename (no extension) similar to the real-world scenario
        const filename = `${generateUUIDLike()}`
        files.push(new File([sampleContent], filename))

        if (fileIdx % 1000 === 0 && fileIdx > 0) {
          console.log(`Created ${fileIdx} files...`)
        }
      }

      console.log(`Finished creating ${files.length} files in flat directory`)
      return files
    }

    /**
     * Generate a UUID-like string for filenames
     *
     * @returns {string} UUID-like string
     */
    function generateUUIDLike() {
      return (
        '0x' +
        Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join('')
      )
    }

    try {
      // Create files with UUID-like names in a flat directory
      const allFiles = createFlatDirectoryFiles()

      console.log('Now encoding directory...')

      // We'll use this to track finalize calls
      let finalizeCalls = 0
      const onDirectoryEntryLink = (
        /** @type {import('../src/types.js').DirectoryEntryLink} */ link
      ) => {
        finalizeCalls++
        if (finalizeCalls % 1000 === 0) {
          console.log(`Finalized ${finalizeCalls} entries...`)
        }
      }

      console.log('Starting directory encoding with many UUID-named files...')

      // Encode the directory structure
      console.time('directoryEncoding')
      const { cid, blocks } = await encodeDirectory(allFiles, {
        onDirectoryEntryLink,
      })
      console.timeEnd('directoryEncoding')

      console.log(
        `Successfully processed flat directory with ${finalizeCalls} entries`
      )
      assert(cid, 'Should return a CID')
      assert(blocks.length > 0, 'Should have encoded blocks')
    } catch (/** @type {unknown} */ error) {
      console.error(
        'Error occurred:',
        error instanceof Error ? error.message : String(error)
      )

      assert.fail(
        `Failed with unexpected error: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  })

  it('handles sharded directory with empty paths', async () => {
    const files = []
    // Add files with various path patterns including empty paths
    files.push(new File(['content empty path'], '')) // empty path
    files.push(new File(['content dot path'], './')) // dot path
    files.push(new File(['content normal'], './testdir/file'))
    files.push(new File(['content normal2'], './testdir/file2'))
    files.push(new File(['content normal3'], './testdir/file3'))

    const { cid, blocks } = await encodeDirectory(files)
    const blockstore = await blocksToBlockstore(blocks)
    const entry = await exporter(cid.toString(), blockstore)
    assert.equal(entry.type, 'directory')

    // Verify that all files are present
    const entries = await collectDir(entry)
    const fileNames = entries.map((e) => e.name)
    assert.equal(
      fileNames.length,
      4,
      'Should have all files - empty and dot paths are considered the same'
    )

    // Verify content and names
    // dot path and empty path are considered the same, but the last file is the one selected
    assert(fileNames.includes(''), 'empty path should exist')
    assert(fileNames.includes('file'), 'testdir/file should exist')
    assert(fileNames.includes('file2'), 'testdir/file2 should exist')
    assert(fileNames.includes('file3'), 'testdir/file3 should exist')

    // Verify content of files
    const emptyFile = entries.find((e) => e.name === '')
    assert.ok(emptyFile, 'empty path file should exist')
    const chunks = []
    for await (const chunk of emptyFile.content()) chunks.push(chunk)
    const content = new Blob(chunks)
    assert.equal(await content.text(), 'content dot path')
  })
})
