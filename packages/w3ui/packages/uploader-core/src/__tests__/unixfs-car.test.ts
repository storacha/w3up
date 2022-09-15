import { Blob, File } from '@web-std/file'
import { CID } from 'multiformats'
import { CarReader } from '@ipld/car'
import { exporter, UnixFSEntry, UnixFSDirectory } from 'ipfs-unixfs-exporter'
import { MemoryBlockstore } from 'blockstore-core/memory'
import path from 'path'
import { encodeFile, encodeDirectory } from '../unixfs-car'

async function collect<T> (collectable: AsyncIterable<T>|Iterable<T>): Promise<T[]> {
  const chunks: T[] = []
  for await (const chunk of collectable) chunks.push(chunk)
  return chunks
}

async function collectDir (dir: UnixFSDirectory): Promise<UnixFSEntry[]> {
  const entries: UnixFSEntry[] = []
  for await (const entry of dir.content()) {
    if (entry.type === 'directory') {
      entries.push(...(await collectDir(entry)))
      continue
    }
    entries.push(entry)
  }
  return entries
}

async function carToBlockstore (car: AsyncIterable<Uint8Array>): Promise<MemoryBlockstore> {
  const blockstore = new MemoryBlockstore()
  const carReader = await CarReader.fromIterable(car)
  for await (const block of carReader.blocks()) {
    await blockstore.put(block.cid, block.bytes)
  }
  return blockstore
}

describe('UnixFS CAR encoder', () => {
  it('encodes a file', async () => {
    const file = new Blob(['test'])

    const { cid, car } = await encodeFile(file)
    expect(cid instanceof CID).toBe(true)

    const blockstore = await carToBlockstore(car)
    const entry = await exporter(cid, blockstore)
    const out = new Blob(await collect(entry.content()))

    expect(await out.text()).toEqual(await file.text())
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
      new File(['another in the child'], 'dir/deeper/six.mp4')
    ]

    const { cid, car } = await encodeDirectory(files)
    expect(cid instanceof CID).toBe(true)

    const blockstore = await carToBlockstore(car)
    const dirEntry = await exporter(cid, blockstore)
    expect(dirEntry).toHaveProperty('type', 'directory')

    const expectedPaths = files.map(f => path.join(cid.toString(), f.name))
    const entries = await collectDir(dirEntry as UnixFSDirectory)
    const actualPaths = entries.map(e => e.path)

    expectedPaths.forEach(p => expect(actualPaths).toContain(p))
  })
})
