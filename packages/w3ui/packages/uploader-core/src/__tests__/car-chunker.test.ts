import { Blob } from '@web-std/file'
import { randomBytes } from 'crypto'
import { encodeFile } from '../unixfs-car'
import { chunkBlocks } from '../car-chunker'
import { collect } from './helpers'

describe('CAR chunker', () => {
  it('chunks', async () => {
    const bytes = randomBytes(1024 * 1024)
    const file = new Blob([bytes])
    const { blocks } = encodeFile(file)

    const chunkSize = 512 * 1024
    const chunks = await collect(chunkBlocks(blocks, { chunkSize }))

    expect(chunks.length).toBeGreaterThan(1)

    for (const car of chunks) {
      const bytes = new Blob(await collect(car))
      expect(bytes.size).toBeLessThanOrEqual(chunkSize)
    }
  })
})
