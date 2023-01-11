# Changelog

## [4.1.0](https://github.com/web3-storage/w3up-client/compare/v4.0.1...v4.1.0) (2023-01-11)


### Features

* add CAR upload method ([#72](https://github.com/web3-storage/w3up-client/issues/72)) ([8b31255](https://github.com/web3-storage/w3up-client/commit/8b31255521e6fd875fe043b9c09b347759ebf315))

## [4.0.1](https://github.com/web3-storage/w3up-client/compare/v4.0.0...v4.0.1) (2022-12-14)


### Bug Fixes

* prod access service DID ([67a5d4c](https://github.com/web3-storage/w3up-client/commit/67a5d4c77eb054f5e0075137e77daed3337f35d2))

## [4.0.0](https://github.com/web3-storage/w3up-client/compare/v3.2.0...v4.0.0) (2022-12-14)


### ⚠ BREAKING CHANGES

* The client has been re-written as a wrapper around [access-client](https://www.npmjs.com/package/@web3-storage/access) and [upload-client](https://www.npmjs.com/package/@web3-storage/upload-client) and the API has changed. 
 
Migration notes:

* `client.account()` has been removed, use `client.currentSpace()`
* `client.exportDelegation()` has been removed, use `client.createDelegation()` and then call `export()` on the returned value and encode the returned blocks as a CAR file using the [`@ipld/car`](https://www.npmjs.com/package/@ipld/car) library.
* `client.identity()` has been removed, use `client.agent()` + `client.currentSpace()` + `client.delegations()`
* `client.importDelegation()` has been removed, use `client.addProof()` (for general delegations to your agent) or `client.addSpace()` (to add a proof and _also_ add the space to your list of spaces).
* `client.insights()` has been removed - this was never working
* `client.invoke()` has been removed
* `client.list()` has been removed, use `client.capability.upload.list()`
* `client.makeDelegation()` has been renamed and signature has changed, use `client.createDelegation()`
* `client.register()` has been removed, use `client.registerSpace()`
* `client.remove()` has been removed, use `client.capability.store.remove()`
* `client.removeUpload()` has been removed, use `client.capability.upload.remove()`
* `client.stat()` has been removed, use `client.capability.store.list()`
* `client.upload()` has been removed, use `client.capability.store.add()`
* `client.uploadAdd()` has been removed, use `client.capability.upload.add()`
* `client.whoami()` has been removed, use `client.capability.space.info()`

### Features

* consume upload and access client ([#58](https://github.com/web3-storage/w3up-client/issues/58)) ([7bd91d5](https://github.com/web3-storage/w3up-client/commit/7bd91d59da2b961a4227d9c062e74169e645a0bc))


### Bug Fixes

* release please package name ([3d00586](https://github.com/web3-storage/w3up-client/commit/3d0058658d4a0e819b2da49c7cea3d084b8bba1b))
* remove pnpm reference from deploy-docs workflow ([6807f5d](https://github.com/web3-storage/w3up-client/commit/6807f5d91366e24ffe28d3177540549efbf808ca))
