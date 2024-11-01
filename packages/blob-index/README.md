# `@storacha/blob-index`

An index for slices that may be sharded across multiple blobs.

## Install

```sh
npm install @storacha/blob-index
```

## Usage

Create:

```js
import { ShardedDAGIndex } from '@storacha/blob-index'

// Create a brand new index
const index = ShardedDAGIndex.create(rootCID)

// Add index data for slices within a shard
index.setSlice(shardMultihash, sliceMultihash, [offset, length])
// ...

// Create CAR archive
const result = index.archive()

console.log(result.ok) // a Uint8Array
```

Read:

```js
import { ShardedDAGIndex } from '@storacha/blob-index'
import { base58btc } from 'multiformats/bases/base58'

const index = ShardedDAGIndex.extract(car)

console.log(index.content)

for (const [shard, slices] of index.shards.entries()) {
  console.log(`Shard ${base58btc.encode(shard.bytes)}`)
  console.log('  Slices:')
  for (const [slice, [offset, length]] of slices.entries()) {
    console.log(`    ${base58btc.encode(slice.bytes)} @ ${offset} -> ${offset + length}`)
  }
}

// Output:
// Shard zQmQKw6B745GGL3eeTcEE5kAoLAJgkBQydJPC5fWv5HA68A
//  Slices:
//    zQmeHPRNRDxHU5YMPewcBCbPYxzA3jBcadAZQwpQXm3jFFt @ 96 -> 128
// ...
```

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/storacha/upload-service/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/storacha/upload-service/blob/main/license.md)
