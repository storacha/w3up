# ⁂ `@web3-storage/capabilities`

[Capabilities](https://en.wikipedia.org/wiki/Capability-based_security) for interacting with [web3.storage](https://web3.storage)

## About

The w3up platform by [web3.storage](https://web3.storage) is implemented as a set of capabilities that can be invoked using the [ucanto](https://github.com/web3-storage/ucanto) RPC framework.

The `@web3-storage/capabilities` package contains capability definitions, which are used by clients to create invocations and by services to validate and parse invocations and route requests to the correct capability handler.

See the [capabilities spec](https://github.com/web3-storage/w3protocol/tree/main/spec/capabilities.md) for more information about each capability included in this package.

## Install

Install the package:

```bash
npm install @web3-storage/capabilities
```

## Usage

[API Reference](https://web3-storage.github.io/w3protocol/modules/_web3_storage_capabilities.html)

```js
import * as Space from '@web3-storage/capabilities/space'
import * as Store from '@web3-storage/capabilities/store'
import * as Top from '@web3-storage/capabilities/top'
import * as Types from '@web3-storage/capabilities/types'
import * as Upload from '@web3-storage/capabilities/upload'
import * as Utils from '@web3-storage/capabilities/utils'
import * as Voucher from '@web3-storage/capabilities/voucher'

// This package has a "main" entrypoint but we recommend the usage of the specific imports above
```
