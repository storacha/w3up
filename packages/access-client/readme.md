<h1 align="center">⁂<br/>web3.storage</h1>
<p align="center">The access client for <a href="https://web3.storage">https://web3.storage</a></p>

## Install

Install the package:

```bash
npm install @web3-storage/access
```

## Usage

[API Reference](https://web3-storage.github.io/w3protocol/modules/_web3_storage_access.html)

```js
import { Agent, connection } from '@web3-storage/access/agent'
import * as Encoding from '@web3-storage/access/encoding'
import { StoreConf } from '@web3-storage/access/stores/store-conf'
// for browsers
import { StoreIndexedDB } from '@web3-storage/access/stores/store-indexeddb'

const store = new StoreConf({ profile: 'app' })
if (!(await store.exists())) {
  await store.init({})
}

const agent = await Agent.create({ store })
```

## Contributing

Feel free to join in. All welcome. Please [open an issue](https://github.com/web3-storage/w3protocol/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/w3protocol/blob/main/license.md)
