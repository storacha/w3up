import assert from 'assert'
import { exporter } from 'ipfs-unixfs-exporter'
import { MemoryBlockstore } from 'blockstore-core/memory'
import * as raw from 'multiformats/codecs/raw'
import path from 'path'
import { encodeFile, encodeDirectory } from '../src/unixfs.js'
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
    // @ts-expect-error https://github.com/ipld/js-unixfs/issues/30
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
    // @ts-expect-error
    const entries = await collectDir(dirEntry)
    const actualPaths = entries.map((e) => e.path)

    expectedPaths.forEach((p) => assert(actualPaths.includes(p)))
  })

  it('throws then treating a file as a directory', () =>
    assert.rejects(
      encodeDirectory([
        new File(['a file, not a directory'], 'file.txt'),
        new File(['a file in a file!!!'], 'file.txt/another.txt'),
      ]),
      { message: '"file.txt" cannot be a file and a directory' }
    ))

  it('configured to use raw leaves', async () => {
    const file = new Blob(['test'])
    const { cid } = await encodeFile(file)
    assert.equal(cid.code, raw.code)
  })
})
